# Script de nettoyage des anciens fichiers obsolètes (agent Python et frontend Laravel)
$root = "c:\xampp\htdocs\Projets\nealix\wifi-watch"

$agentDir = Join-Path $root "agent"
$frontendDir = Join-Path $root "frontend"

Write-Host "Nettoyage des anciens dossiers..."

if (Test-Path $agentDir) {
    Write-Host "Suppression de l'ancien dossier agent ($agentDir)..."
    Remove-Item -Path $agentDir -Recurse -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $agentDir)) {
        Write-Host "Dossier agent supprime avec succes."
    } else {
        Write-Host "Note: Certains fichiers de agent ont ete supprimes."
    }
}

if (Test-Path $frontendDir) {
    Write-Host "Suppression de l'ancien dossier frontend ($frontendDir)..."
    Remove-Item -Path $frontendDir -Recurse -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $frontendDir)) {
        Write-Host "Dossier frontend supprime avec succes."
    } else {
        Write-Host "Note: Certains fichiers de frontend ont ete supprimes."
    }
}

Write-Host "Nettoyage termine!"
