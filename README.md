# English Adventure: Little Town

Браузерная обучающая игра: английский язык уровня Pre-A1 для детей и подростков 6–15 лет.
Ребёнок живёт в маленьком городке, помогает жителям, собирает коллекцию — и учит английский через задания, а не через тесты.

**Статус:** Этап 4 — весь городок (4 локации, 12 квестов, спутник Пип) и экран для родителей: что ребёнок умеет, слова и путаница, время игры, дневной лимит, PIN, резервная копия прогресса в файл. Отчёт — [docs/STAGE_REPORTS.md](docs/STAGE_REPORTS.md).

## Документы

| Файл | Что внутри |
|---|---|
| [MASTER_PROMPT_MVP.md](MASTER_PROMPT_MVP.md) | Задание на MVP — источник правды |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Устройство игры, модули, хранение, звук и речь |
| [docs/DATA_SCHEMAS.md](docs/DATA_SCHEMAS.md) | Форматы контента и прогресса, как добавить слово или квест |
| [docs/RISKS.md](docs/RISKS.md) | Риски и открытые вопросы |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Журнал решений |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Идеи на после MVP |
| [docs/STAGE_REPORTS.md](docs/STAGE_REPORTS.md) | Что сделано на каждом этапе, как проверить |

## Запуск

Нужен Node.js 20+.

```bash
npm install
npm run dev               # игра в режиме разработки: http://localhost:5173
npm run build             # проверка контента + типов + сборка в dist/
npm run build:single      # вся игра одним файлом: dist-single/index.html
npm test                  # модульные тесты + проверка контента
npm run test:e2e          # сквозные тесты в Chrome: управление, квесты дома, полное прохождение городка (после npm run build)
npm run art-preview       # лист со всей графикой: art-preview.png
```

## Публикация на GitHub Pages

1. Загрузить проект в репозиторий на GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Каждый push в `main` проверяет игру автотестами и публикует её (`.github/workflows/deploy.yml`).
