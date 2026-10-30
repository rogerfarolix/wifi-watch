# Script de creation du raccourci sur le Bureau de l'utilisateur
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Wifi-Watch.lnk"

$root = "c:\xampp\htdocs\Projets\nealix\wifi-watch"
$exePath = Join-Path $root "desktop-app\dist\Wifi-Watch-Portable.exe"
$vbsPath = Join-Path $root "Wifi-Watch-Silencieux.vbs"
$icoPath = Join-Path $root "desktop-app\src\renderer\assets\icon.ico"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)

if (Test-Path $exePath) {
    Write-Host "Ciblage de l'executable autonome : $exePath"
    $shortcut.TargetPath = $exePath
    $shortcut.WorkingDirectory = [System.IO.Path]::GetDirectoryName($exePath)
    $shortcut.IconLocation = "$exePath,0"
} else {
    Write-Host "Ciblage du lanceur silencieux : $vbsPath"
    $shortcut.TargetPath = "wscript.exe"
    $shortcut.Arguments = "`"$vbsPath`""
    $shortcut.WorkingDirectory = $root
    $shortcut.IconLocation = "$icoPath,0"
}

$shortcut.Description = "Wifi-Watch // Cyber Sentinel - Surveillance & Defense Reseau en Temps Reel"
$shortcut.Save()

Write-Host "Raccourci cree avec succes sur le Bureau : $shortcutPath"
