param(
  [string]$Distro = "Ubuntu",
  [string]$WslUser = $env:USERNAME,
  [switch]$SkipTailscaleInstall,
  [switch]$SkipTailscaleLogin,
  [switch]$SkipScheduledTask
)

$ErrorActionPreference = "Stop"

function Assert-Admin {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "This script must run in an elevated PowerShell session."
  }
}

function Assert-WslUserName {
  param([string]$Name)

  if ([string]::IsNullOrWhiteSpace($Name)) {
    throw "WSL username cannot be empty."
  }

  if ($Name -notmatch '^[a-z_][a-z0-9_-]*$') {
    throw "WSL username '$Name' is invalid. Use a simple Linux-safe name such as 'holyd'."
  }
}

function Invoke-WslRoot {
  param([string]$Command)
  $Command | wsl.exe -d $Distro -u root --exec bash -lc "tr -d '\r' | bash -s --"
  if ($LASTEXITCODE -ne 0) {
    throw "WSL root command failed with exit code $LASTEXITCODE."
  }
}

function Invoke-WslUser {
  param([string]$Command)
  $Command | wsl.exe -d $Distro -u $WslUser --exec bash -lc "tr -d '\r' | bash -s --"
  if ($LASTEXITCODE -ne 0) {
    throw "WSL user command failed with exit code $LASTEXITCODE."
  }
}

function Get-RepoRoot {
  (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
}

function Get-RepoRootWsl {
  param([string]$RepoRoot)
  $escapedRepoRoot = $RepoRoot.Replace("\\", "\\\\")
  (& wsl.exe -d $Distro -u root -- bash -lc "wslpath -a '$escapedRepoRoot'").Trim()
}

function Ensure-WslUser {
  $command = @(
    "set -eu",
    "username='$WslUser'",
    'if ! id -u "$username" >/dev/null 2>&1; then useradd -m -s /bin/bash "$username"; fi',
    'if getent group sudo >/dev/null 2>&1; then usermod -aG sudo "$username"; fi',
    'printf ''[user]\ndefault=%s\n'' "$username" > /etc/wsl.conf',
    'home_dir="$(getent passwd "$username" | cut -d: -f6)"',
    'mkdir -p "$home_dir"',
    'chown "$username":"$username" "$home_dir"'
  ) -join "; "

  Invoke-WslRoot -Command $command | Out-Null
}

function Install-WslAssets {
  param([string]$RepoRootWsl)

  $rootCommand = @(
    "set -eu",
    'if ! command -v tmux >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y tmux git; fi',
    "repo_root='$RepoRootWsl'",
    'install -D -m 0755 "$repo_root/scripts/windows/robust-terminal/wsl/droid-tmux" /usr/local/bin/droid-tmux',
    'sed -i ''s/\r$//'' /usr/local/bin/droid-tmux'
  ) -join "; "
  Invoke-WslRoot -Command $rootCommand | Out-Null

  $userCommand = @(
    "set -eu",
    "set -o pipefail",
    "repo_root='$RepoRootWsl'",
    'install -D -m 0644 "$repo_root/scripts/windows/robust-terminal/wsl/tmux.conf" "$HOME/.tmux.conf"',
    'sed -i ''s/\r$//'' "$HOME/.tmux.conf"',
    'mkdir -p "$HOME/.tmux/plugins"',
    'if [[ ! -d "$HOME/.tmux/plugins/tpm/.git" ]]; then git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"; fi',
    'if ! tmux has-session -t __bootstrap 2>/dev/null; then tmux new-session -d -s __bootstrap -c "$HOME"; fi',
    'tmux set-environment -g TMUX_PLUGIN_MANAGER_PATH "$HOME/.tmux/plugins"',
    'tmux source-file "$HOME/.tmux.conf"',
    '"$HOME/.tmux/plugins/tpm/bin/install_plugins"',
    "/usr/local/bin/droid-tmux bootstrap",
    'tmux run-shell "$HOME/.tmux/plugins/tmux-resurrect/scripts/save.sh" || true',
    'tmux kill-session -t __bootstrap 2>/dev/null || true'
  ) -join "; "
  Invoke-WslUser -Command $userCommand | Out-Null
}

function Install-OpenSshServer {
  $capability = Get-WindowsCapability -Online | Where-Object Name -like "OpenSSH.Server*"
  if ($null -eq $capability) {
    throw "OpenSSH.Server capability was not found."
  }

  if ($capability.State -ne "Installed") {
    Add-WindowsCapability -Online -Name $capability.Name | Out-Null
  }

  Set-Service -Name sshd -StartupType Automatic
  Start-Service -Name sshd

  $firewallRule = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue
  if ($null -eq $firewallRule) {
    New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server (sshd)" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
  } else {
    Set-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -Enabled True -Action Allow | Out-Null
  }
}

function Install-DroidWrapper {
  param([string]$RepoRoot)

  $targetDir = "C:\ProgramData\droid\bin"
  $source = Join-Path $RepoRoot "scripts\windows\robust-terminal\windows\droid.cmd"
  $psSource = Join-Path $RepoRoot "scripts\windows\robust-terminal\windows\droid.ps1"
  $target = Join-Path $targetDir "droid.cmd"
  $psTarget = Join-Path $targetDir "droid.ps1"

  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item -Force -Path $source -Destination $target
  Copy-Item -Force -Path $psSource -Destination $psTarget
  [Environment]::SetEnvironmentVariable("DROID_WSL_DISTRO", $Distro, "Machine")
  [Environment]::SetEnvironmentVariable("DROID_WSL_USER", $WslUser, "Machine")

  $pathScopes = @("User", "Machine")
  foreach ($scope in $pathScopes) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", $scope)
    $entries = @()
    if (-not [string]::IsNullOrWhiteSpace($currentPath)) {
      $entries = $currentPath.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries) |
        Where-Object { $_.TrimEnd('\') -ne $targetDir.TrimEnd('\') }
    }
    $newPath = @($targetDir) + $entries
    [Environment]::SetEnvironmentVariable("Path", ($newPath -join ";"), $scope)
  }

  $npmShimDir = Join-Path $env:APPDATA "npm"
  if (Test-Path $npmShimDir) {
    $cmdShimPath = Join-Path $npmShimDir "droid.cmd"
    $psShimPath = Join-Path $npmShimDir "droid.ps1"
    $cmdDelegate = "@echo off`r`ncall `"$target`" %*`r`n"
    $psDelegate = "& '$psTarget' @args`r`nexit `$LASTEXITCODE`r`n"

    if (Test-Path $cmdShimPath) {
      $cmdCurrent = Get-Content -Raw -Path $cmdShimPath
      if ($cmdCurrent -notlike "*$target*") {
        $cmdBackup = Join-Path $npmShimDir "droid.paperclip-original.cmd"
        if (-not (Test-Path $cmdBackup)) {
          Copy-Item -Force -Path $cmdShimPath -Destination $cmdBackup
        }
        Set-Content -Path $cmdShimPath -Value $cmdDelegate -Encoding ascii
      }
    }

    if (Test-Path $psShimPath) {
      $psCurrent = Get-Content -Raw -Path $psShimPath
      if ($psCurrent -notlike "*$psTarget*") {
        $psBackup = Join-Path $npmShimDir "droid.paperclip-original.ps1"
        if (-not (Test-Path $psBackup)) {
          Copy-Item -Force -Path $psShimPath -Destination $psBackup
        }
        Set-Content -Path $psShimPath -Value $psDelegate -Encoding ascii
      }
    }
  }
}

function Install-RemoteKey {
  $sshDir = Join-Path $env:USERPROFILE ".ssh"
  $privateKey = Join-Path $sshDir "id_ed25519_droid_remote"
  $publicKey = "$privateKey.pub"
  $adminAuthorizedKeys = "C:\ProgramData\ssh\administrators_authorized_keys"

  New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
  if (-not (Test-Path $privateKey)) {
    $sshKeygenArgumentLine = ('-t ed25519 -f "{0}" -N "" -C droid-remote' -f $privateKey)
    $sshKeygenProcess = Start-Process -FilePath "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -ArgumentList $sshKeygenArgumentLine -Wait -NoNewWindow -PassThru
    if ($sshKeygenProcess.ExitCode -ne 0) {
      throw "ssh-keygen failed with exit code $($sshKeygenProcess.ExitCode)."
    }
  }

  $publicKeyText = (Get-Content -Raw -Path $publicKey).Trim()
  if (-not (Test-Path $adminAuthorizedKeys)) {
    New-Item -ItemType File -Force -Path $adminAuthorizedKeys | Out-Null
  }

  $authorizedKeys = Get-Content -Path $adminAuthorizedKeys -ErrorAction SilentlyContinue
  if ($authorizedKeys -notcontains $publicKeyText) {
    Add-Content -Path $adminAuthorizedKeys -Value $publicKeyText
  }

  & icacls.exe $adminAuthorizedKeys /inheritance:r /grant "*S-1-5-32-544:F" /grant "*S-1-5-18:F" | Out-Null
}

function Install-Tailscale {
  if (Get-Command tailscale.exe -ErrorAction SilentlyContinue) {
    return
  }

  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "x86" } else { "amd64" }
  $packagesPage = Invoke-WebRequest -UseBasicParsing -Uri "https://pkgs.tailscale.com/stable/#windows"
  $pattern = "tailscale-setup-[0-9.]+-$arch\.msi"
  $match = [regex]::Match($packagesPage.Content, $pattern)
  if (-not $match.Success) {
    throw "Could not resolve the latest Tailscale MSI URL for architecture $arch."
  }

  $msiName = $match.Value
  $msiUrl = "https://pkgs.tailscale.com/stable/$msiName"
  $msiPath = Join-Path $env:TEMP $msiName

  Invoke-WebRequest -UseBasicParsing -Uri $msiUrl -OutFile $msiPath
  $arguments = @(
    "/i",
    $msiPath,
    "/qn",
    "/norestart",
    'TS_UNATTENDEDMODE="always"',
    'TS_ALLOWINCOMINGCONNECTIONS="always"',
    'TS_NOLAUNCH="1"'
  )
  Start-Process -FilePath "msiexec.exe" -ArgumentList $arguments -Wait -NoNewWindow
}

function Start-TailscaleLoginIfNeeded {
  $tailscaleExe = "$env:ProgramFiles\Tailscale\tailscale.exe"
  if (-not (Test-Path $tailscaleExe)) {
    return $null
  }

  try {
    $statusJson = & $tailscaleExe status --json 2>$null
    if ($LASTEXITCODE -eq 0 -and $statusJson) {
      $status = $statusJson | ConvertFrom-Json
      if ($status.Self -and $status.Self.Online) {
        return [pscustomobject]@{
          Online = $true
          BackendState = $status.BackendState
          TailscaleIPs = @($status.Self.TailscaleIPs)
          HostName = $status.Self.DNSName
          LoginUrl = $null
        }
      }
    }
  } catch {
  }

  if ($SkipTailscaleLogin) {
    return [pscustomobject]@{
      Online = $false
      BackendState = "NeedsLogin"
      TailscaleIPs = @()
      HostName = $null
      LoginUrl = $null
    }
  }

  $stdoutPath = Join-Path $env:TEMP "tailscale-up.stdout.log"
  $stderrPath = Join-Path $env:TEMP "tailscale-up.stderr.log"
  Remove-Item -Force -ErrorAction SilentlyContinue $stdoutPath, $stderrPath
  $tailscaleUp = Start-Process -FilePath $tailscaleExe -ArgumentList "up --unattended --qr" -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -Wait -PassThru -NoNewWindow
  $loginOutput = @(
    if (Test-Path $stdoutPath) { Get-Content -Raw -Path $stdoutPath }
    if (Test-Path $stderrPath) { Get-Content -Raw -Path $stderrPath }
  ) -join "`n"
  $loginUrl = ($loginOutput | Select-String -Pattern "https://login\.tailscale\.com/[A-Za-z0-9/_=?&.-]+" -AllMatches).Matches.Value | Select-Object -First 1

  try {
    $statusJson = & $tailscaleExe status --json 2>$null
    if ($LASTEXITCODE -eq 0 -and $statusJson) {
      $status = $statusJson | ConvertFrom-Json
      return [pscustomobject]@{
        Online = [bool]($status.Self -and $status.Self.Online)
        BackendState = $status.BackendState
        TailscaleIPs = @($status.Self.TailscaleIPs)
        HostName = $status.Self.DNSName
        LoginUrl = $loginUrl
      }
    }
  } catch {
  }

  return [pscustomobject]@{
    Online = $false
    BackendState = if ($tailscaleUp.ExitCode -eq 0) { "PendingStatusRefresh" } else { "NeedsLogin" }
    TailscaleIPs = @()
    HostName = $null
    LoginUrl = $loginUrl
  }
}

function Register-DroidBootstrapTask {
  if ($SkipScheduledTask) {
    return
  }

  $taskName = "DroidTmuxBootstrap"
  $action = New-ScheduledTaskAction -Execute "C:\ProgramData\droid\bin\droid.cmd" -Argument "bootstrap"
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

Assert-Admin
$WslUser = $WslUser.ToLowerInvariant()
Assert-WslUserName -Name $WslUser
$repoRoot = Get-RepoRoot
$repoRootWsl = Get-RepoRootWsl -RepoRoot $repoRoot

Ensure-WslUser
Install-WslAssets -RepoRootWsl $repoRootWsl
Install-OpenSshServer
Install-DroidWrapper -RepoRoot $repoRoot
Install-RemoteKey
Register-DroidBootstrapTask

if (-not $SkipTailscaleInstall) {
  Install-Tailscale
}

$tailscaleStatus = Start-TailscaleLoginIfNeeded

[pscustomobject]@{
  Distro = $Distro
  WslUser = $WslUser
  DroidCommand = "droid"
  SshUser = $env:USERNAME
  RemoteKey = (Join-Path $env:USERPROFILE ".ssh\id_ed25519_droid_remote")
  TailscaleOnline = if ($tailscaleStatus) { $tailscaleStatus.Online } else { $false }
  TailscaleBackendState = if ($tailscaleStatus) { $tailscaleStatus.BackendState } else { $null }
  TailscaleIPs = if ($tailscaleStatus) { $tailscaleStatus.TailscaleIPs } else { @() }
  TailscaleHostName = if ($tailscaleStatus) { $tailscaleStatus.HostName } else { $null }
  TailscaleLoginUrl = if ($tailscaleStatus) { $tailscaleStatus.LoginUrl } else { $null }
} | ConvertTo-Json -Depth 4
