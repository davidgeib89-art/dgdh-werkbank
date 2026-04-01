$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptDir "droid.cmd") @args
exit $LASTEXITCODE