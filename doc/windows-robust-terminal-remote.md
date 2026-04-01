# Windows Robust Terminal Remote Setup

This repo now carries a reproducible setup for robust Windows terminals with these pieces:

- WSL2 Ubuntu for the actual long-running shell processes
- tmux with tmux-resurrect and tmux-continuum for detach/reattach and session restore
- Windows OpenSSH Server for inbound SSH to the Windows host
- a Windows `droid` wrapper that jumps straight into WSL tmux
- an SSH key dedicated to this remote path
- optional Tailscale install for private remote access without opening a public port

## Install or repair

Run an elevated PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\robust-terminal\install.ps1
```

The installer is idempotent. Re-running it is the supported repair path.

Important:

- `droid` is meant to enter WSL as a normal non-root user, not `root`
- the installer creates or repairs the target WSL user and defaults it to your Windows username lowercased, for example `holyd`
- if your distro previously defaulted to `root`, re-running the installer is the intended repair path
- plain `wsl -d Ubuntu` can keep showing the old default user until you run `wsl --shutdown`; `droid` does not rely on that because it always passes the configured WSL user explicitly
- this matters for Paperclip runtime work because embedded PostgreSQL must not start from privileged shell contexts

If you need to override the WSL username explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\robust-terminal\install.ps1 -WslUser holyd
```

## Local use

From PowerShell, Command Prompt, or an SSH session into this Windows machine:

```powershell
droid
droid review
droid runbook
droid ops
droid list
```

The default named sessions are:

- `droid-main`
- `droid-review`
- `droid-runbook`
- `droid-ops`

Quick self-check:

```powershell
wsl -d Ubuntu -u holyd --exec whoami
droid list
```

The first command should print your normal WSL user, not `root`.

## SSH verification

After OpenSSH Server is active, the dedicated key lives at:

```text
%USERPROFILE%\.ssh\id_ed25519_droid_remote
```

From the same PC, a self-check looks like this:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_droid_remote -o StrictHostKeyChecking=accept-new $env:USERNAME@localhost droid list
```

## Phone use

Recommended path:

1. Install Tailscale on the phone and sign into the same tailnet.
2. Import `%USERPROFILE%\.ssh\id_ed25519_droid_remote` into Termius or your SSH client.
3. SSH to the Windows host over its Tailscale address or MagicDNS name.
4. Run `droid`, `droid review`, or `droid runbook`.

Important: Tailscale SSH server mode is not available on Windows hosts, so the working pattern on Windows is normal SSH over the private Tailscale network, not `tailscale set --ssh` on Windows.
