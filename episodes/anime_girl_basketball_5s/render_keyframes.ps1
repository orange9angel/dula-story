Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$episodeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$storyDir = Resolve-Path (Join-Path $episodeDir '..\..')
$episodeRelativePath = '.\episodes\anime_girl_basketball_5s'

Push-Location $storyDir
try {
  & npx.cmd dula-render $episodeRelativePath --duration 30
  if ($LASTEXITCODE -ne 0) {
    throw "dula-render failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}
