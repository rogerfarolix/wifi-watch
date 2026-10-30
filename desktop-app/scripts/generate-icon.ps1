Add-Type -AssemblyName System.Drawing

$assetsDir = "c:\xampp\htdocs\Projets\nealix\wifi-watch\desktop-app\src\renderer\assets"
$srcImgPath = Join-Path $assetsDir "icon.png"
$icoPath = Join-Path $assetsDir "icon.ico"

Write-Host "Chargement de l'image source..."
$src = [System.Drawing.Image]::FromFile($srcImgPath)

# Créer un bitmap 256x256 haute qualité
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 256, 256)

$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()

$ms.Dispose()
$g.Dispose()
$bmp.Dispose()
$src.Dispose()

# Écrire le fichier PNG réel
[System.IO.File]::WriteAllBytes($srcImgPath, $pngBytes)
Write-Host "PNG 256x256 réécrit avec succès."

# Écrire le fichier ICO valide Windows
$icoFs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter $icoFs

# ICONDIR
$bw.Write([UInt16]0)          # Reserved
$bw.Write([UInt16]1)          # Type 1 = ICO
$bw.Write([UInt16]1)          # 1 image

# ICONDIRENTRY (16 octets)
$bw.Write([Byte]0)            # Width: 0 = 256px
$bw.Write([Byte]0)            # Height: 0 = 256px
$bw.Write([Byte]0)            # Colors
$bw.Write([Byte]0)            # Reserved
$bw.Write([UInt16]1)          # Color planes
$bw.Write([UInt16]32)         # Bits per pixel
$bw.Write([UInt32]$pngBytes.Length) # Image size in bytes
$bw.Write([UInt32]22)         # Offset of image data (6 + 16 = 22)

# Raw PNG payload
$bw.Write($pngBytes)

$bw.Close()
$icoFs.Close()

Write-Host "Fichier ICO généré : $icoPath ($($pngBytes.Length + 22) octets)"
