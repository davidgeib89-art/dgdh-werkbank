@echo off
setlocal
if "%DROID_WSL_DISTRO%"=="" set "DROID_WSL_DISTRO=Ubuntu"
if "%DROID_WSL_USER%"=="" set "DROID_WSL_USER=%USERNAME%"
if not "%~1"=="" (
  wsl.exe -d %DROID_WSL_DISTRO% -u %DROID_WSL_USER% --exec /usr/local/bin/droid-tmux %*
) else (
  wsl.exe -d %DROID_WSL_DISTRO% -u %DROID_WSL_USER% --exec /usr/local/bin/droid-tmux attach main
)
endlocal
