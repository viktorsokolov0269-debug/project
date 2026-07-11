# Как включить ссылку на GitHub

После этих шагов приложение будет открываться по адресу:

**https://viktorsokolov0269-debug.github.io/project/**

---

## Шаг 1. Сделать репозиторий публичным

Сейчас репозиторий **private**. Бесплатный GitHub Pages работает только для **public**.

1. Откройте репозиторий → **Settings**
2. Прокрутите вниз до **Danger Zone**
3. **Change repository visibility** → **Change to public**
4. Подтвердите

## Шаг 2. Включить GitHub Pages

1. **Settings** → слева **Pages**
2. В блоке **Build and deployment**:
   - **Source**: `GitHub Actions`
3. Сохраните (если попросит)

## Шаг 3. Запустить публикацию

1. Влейте (Merge) pull request в `main`  
   или вкладка **Actions** → **Deploy to GitHub Pages** → **Run workflow**
2. Дождитесь зелёной галочки у workflow
3. Откройте ссылку:

### ➡️ https://viktorsokolov0269-debug.github.io/project/

---

## Альтернатива без Actions (папка docs)

Если не хотите Actions:

1. **Settings** → **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main`
4. **Folder**: `/docs`
5. **Save**

Ссылка будет той же: https://viktorsokolov0269-debug.github.io/project/
