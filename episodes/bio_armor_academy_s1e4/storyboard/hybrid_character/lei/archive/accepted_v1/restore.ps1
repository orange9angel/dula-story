param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$snapshotRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$manifest = Get-Content -LiteralPath (Join-Path $snapshotRoot 'manifest.json') -Raw | ConvertFrom-Json
$workspaceRoot = [IO.Path]::GetFullPath($manifest.workspaceRoot).TrimEnd('\')
$items = foreach ($entry in $manifest.files) {
    $sourcePath = [IO.Path]::GetFullPath((Join-Path $snapshotRoot $entry.copy))
    $targetPath = [IO.Path]::GetFullPath((Join-Path $workspaceRoot $entry.target))
    if (-not $sourcePath.StartsWith($snapshotRoot + '\files\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Snapshot source escapes files directory' }
    $assetRoot = $workspaceRoot + '\dula-assets\'
    $episodeRoot = $workspaceRoot + '\dula-story\episodes\bio_armor_academy_s1e4\'
    if (-not ($targetPath.StartsWith($assetRoot, [StringComparison]::OrdinalIgnoreCase) -or $targetPath.StartsWith($episodeRoot, [StringComparison]::OrdinalIgnoreCase))) { throw 'Restore target is outside the recorded character workspace' }
    if ((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Snapshot hash mismatch: $sourcePath" }
    $matches = (Test-Path -LiteralPath $targetPath -PathType Leaf) -and ((Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash.ToLowerInvariant() -eq $entry.sha256)
    [pscustomobject]@{ Source=$sourcePath; Target=$targetPath; Hash=$entry.sha256; Matches=$matches }
}
if ($Apply) {
    foreach ($item in $items) {
        if (-not $item.Matches) { Copy-Item -LiteralPath $item.Source -Destination $item.Target }
        if ((Get-FileHash -LiteralPath $item.Target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.Hash) { throw "Restore verification failed: $($item.Target)" }
    }
    Write-Output "Restored and verified $($items.Count) files."
} else {
    Write-Output "Snapshot verified: $($items.Count) files. Current differences: $(($items | Where-Object { -not $_.Matches }).Count). No files changed. Use -Apply to restore."
}
