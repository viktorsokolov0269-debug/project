# Сопоставление ОЭ и ОР (1С ERP × 1С ТОИР)

## Открыть на GitHub (постоянная ссылка)

Сделайте 2 настройки в репозитории — подробная инструкция: **[GITHUB-PAGES.md](GITHUB-PAGES.md)**

1. **Settings → Danger Zone → Change visibility → Public**
2. **Settings → Pages → Source: GitHub Actions** (или branch `main` / папка `/docs`)

После этого ссылка:

### ➡️ https://viktorsokolov0269-debug.github.io/project/

---

## Как пользоваться

1. Откройте ссылку  
2. Загрузите Excel с **ОЭ** (код + наименование)  
3. Загрузите Excel с **ОР** (код + наименование)  
4. Для каждой строки ОЭ найдите ОР через поиск  
5. Сохраните результат кнопками **Excel** или **JSON**

Примеры: [`sample-data/oe_sample.xlsx`](sample-data/oe_sample.xlsx), [`sample-data/or_sample.xlsx`](sample-data/or_sample.xlsx)

## Запуск на компьютере

```bash
./start.sh
```

Windows: `start.bat` → откроется http://localhost:4173

## Возможности

- Загрузка Excel ОЭ и ОР  
- Поиск ОР по коду и наименованию  
- Фильтры и проверка дубликатов  
- Экспорт в Excel / JSON (4 столбца)  
- Автосохранение прогресса в браузере  
