#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Установка зависимостей..."
npm install

echo "Сборка..."
npm run build

echo ""
echo "=========================================="
echo "  Приложение: http://localhost:4173"
echo "  Откройте эту ссылку в браузере"
echo "=========================================="
echo ""

if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:4173") &
elif command -v open >/dev/null 2>&1; then
  (sleep 1 && open "http://localhost:4173") &
fi

npx --yes serve docs -l 4173
