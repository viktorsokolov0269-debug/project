# Скачивает актуальный HTML-сопоставитель в рабочую папку проекта.
$dest = "C:\Users\sokolovvg\Documents\ПРОЕКТЫ\15 Буинский сахар\2 Этап\ОР\2026-07-07"
$fileName = "html соспоставление — копия.html"
$url = "https://raw.githubusercontent.com/viktorsokolov0269-debug/project/cursor/oe-or-matching-fixes-d3ea/oe-or-matcher.html"

New-Item -ItemType Directory -Force -Path $dest | Out-Null
$out = Join-Path $dest $fileName
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
Write-Host "Готово: $out"
