# Nanograms — Agent Development Roadmap

Статус: active  
Цель документа: пошаговый план реализации MVP0 → MVP1  
Формат: каждая задача предназначена для выполнения coding agent'ом.

Агент должен выполнять задачи последовательно, не перепрыгивая через незакрытые зависимости.

После успешного выполнения задачи агент обязан поставить `[x]` у соответствующего пункта и оставить краткую запись о результате.

---

## 0. Правила для агентов

### 0.1. Общий workflow

Перед началом каждой задачи агент должен:

1. Прочитать README.md.
2. Прочитать Архитектура.md.
3. Прочитать Нанограммы.md.
4. Прочитать этот ROADMAP.md.
5. Проверить состояние репозитория.
6. Проверить, какие предыдущие задачи уже выполнены.
7. Изучить существующий код и не создавать дублирующую реализацию.

После выполнения:

1. Запустить относящиеся к задаче тесты.
2. Запустить линтер/форматтер, если он уже настроен.
3. Проверить, что существующая функциональность не сломана.
4. Обновить `[ ]` → `[x]` для выполненных подзадач.
5. Добавить короткую запись в Progress log.
6. Не отмечать задачу выполненной, если критерии готовности не выполнены.

### 0.2. Правила изменения архитектуры

Архитектура проекта уже определена.

Основные границы:

```
Frontend
   │
   │ HTTP
   ▼
HTTP/API
   │
   ▼
Application
   │
   ▼
Domain
   │
   ▼
PuzzleRepository
   │
   ▼
JSON files
```

Не добавлять без явной необходимости:

- database;
- Redis;
- message broker;
- микросервисы;
- DI container;
- CQRS;
- event bus;
- generic repository framework;
- сложный web framework;
- authentication;
- server-side user state.

Если для реализации задачи кажется необходимым изменить архитектуру:

1. остановиться;
2. описать проблему;
3. предложить минимальное изменение;
4. не внедрять его молча.

### 0.3. Definition of Done для каждой задачи

Задача считается выполненной только если:

- код реализован;
- код соответствует существующей архитектуре;
- необходимые тесты добавлены;
- тесты проходят;
- нет очевидных регрессий;
- документация обновлена, если изменилось публичное поведение;
- чекбокс задачи отмечен `[x]`;
- в Progress log есть запись.

---

## MVP0 — Foundation

Цель MVP0 — получить работающий технический скелет:

```
Browser
   ↓
Frontend
   ↓ HTTP
Go server
   ↓
Application
   ↓
JSON storage
```

К концу MVP0 должно быть возможно:

- запустить проект;
- получить список puzzle через API;
- получить один puzzle через API;
- открыть frontend;
- увидеть puzzle;
- взаимодействовать с базовой grid.

MVP0 не обязан выглядеть красиво.

Главная задача — получить первый вертикальный срез продукта.

---

## 1. MVP0 — Project baseline

### 1.1. Изучить существующий repository — [x]

- Проверить текущую структуру репозитория.
- Проверить существующие файлы документации.
- Проверить .gitignore.
- Проверить текущую git history.
- Проверить, отсутствует ли уже частичная реализация.
- Зафиксировать фактическое состояние проекта в Progress log.

**Acceptance criteria**

- агент понимает текущее состояние repository;
- не создаются дублирующие файлы/модули;
- дальнейшие задачи опираются на фактическую структуру проекта.

---

## 2. MVP0 — Backend skeleton

### 2.1. Создать Go module — [x]

- Создать go.mod.
- Выбрать актуальную версию Go, совместимую с окружением проекта.
- Не добавлять зависимости без необходимости.

**Acceptance criteria**

`go test ./...` успешно выполняется.

### 2.2. Создать структуру backend — [x]

Предпочтительная структура:

```
cmd/
  server/

internal/
  domain/
  application/
  storage/
  http/

data/
  puzzles/
```

- Создать cmd/server.
- Создать domain package.
- Создать application package.
- Создать storage package.
- Создать HTTP package.
- Создать data/puzzles.

Не создавать пустые абстракции, если они пока не используются.

### 2.3. Реализовать HTTP server — [x]

- Создать HTTP server.
- Добавить конфигурацию port через environment variable или разумный default.
- Добавить graceful shutdown.
- Добавить базовое логирование.
- Добавить простой health endpoint.

Например:

```
GET /health
```

**Acceptance criteria**

Сервер запускается локально и отвечает `200 OK` на `/health`.

---

## 3. MVP0 — Domain model

### 3.1. Создать Puzzle — [x]

Модель должна поддерживать требования документации:

- id;
- title;
- width;
- height;
- difficulty;
- rowHints;
- columnHints;
- solution.

Задачи:

- Создать Puzzle.
- Определить типы полей.
- Не смешивать HTTP DTO и domain model.
- Добавить необходимые domain-level validation rules.

### 3.2. Создать CellState — [x]

Определить три состояния: `empty`, `filled`, `marked`.

- Создать тип CellState.
- Определить безопасные значения.
- Не использовать произвольные строки по всему приложению.
- Добавить тесты для допустимых состояний.

### 3.3. Создать PuzzleProgress — [x]

Модель должна отражать:

```
PuzzleProgress
├── puzzleId
├── cells
├── startedAt
├── elapsedTime
├── status
└── completedAt
```

Статусы: `not_started`, `in_progress`, `completed`.

- Создать модель прогресса.
- Определить статус.
- Определить представление cells.
- Определить правила перехода между статусами.
- Добавить unit tests.

---

## 4. MVP0 — Puzzle JSON format

### 4.1. Зафиксировать JSON schema v1 — [x]

Каждый puzzle должен содержать:

```json
{
  "version": 1,
  "id": "001",
  "title": "Example",
  "width": 5,
  "height": 5,
  "difficulty": "easy",
  "rowHints": [],
  "columnHints": [],
  "solution": []
}
```

- Зафиксировать формат.
- Проверить согласованность размеров.
- Проверить корректность solution.
- Проверить наличие всех обязательных полей.
- Версионировать формат через version.

### 4.2. Добавить тестовые puzzles — [x]

Создать минимум:

```
data/puzzles/
├── 001.json   # 5×5
├── 002.json   # 10×10
├── 003.json   # 15×15
└── 004.json   # 20×20
```

- Добавить 5×5.
- Добавить 10×10.
- Добавить 15×15.
- Добавить 20×20.
- Убедиться, что puzzles действительно решаемы.
- Убедиться, что hints соответствуют solution.

---

## 5. MVP0 — PuzzleRepository

### 5.1. Создать repository interface — [x]

Рекомендуемый контракт:

```go
type PuzzleRepository interface {
    Get(ctx context.Context, id string) (*Puzzle, error)
    List(ctx context.Context) ([]Puzzle, error)
}
```

- Создать interface.
- Разместить interface на уровне, который не зависит от JSON implementation.
- Не добавлять CRUD, если он не нужен MVP.

### 5.2. Реализовать JSONPuzzleRepository — [x]

- Читать puzzles из data/puzzles.
- Декодировать JSON.
- Валидировать puzzle.
- Обрабатывать отсутствующий puzzle.
- Обрабатывать повреждённый JSON.
- Реализовать List.
- Реализовать Get.

**Tests**

- успешно загружается valid puzzle;
- invalid JSON возвращает ошибку;
- missing puzzle возвращает корректную ошибку;
- list возвращает все valid puzzles;
- invalid puzzle не приводит к silent corruption.

---

## 6. MVP0 — Application layer

### 6.1. Puzzle service — [x]

Создать application service для работы с puzzles.

- Получение списка puzzles.
- Получение puzzle по ID.
- Отделить application API от storage implementation.
- Не передавать HTTP request/response models внутрь domain.

**Acceptance criteria**

Application layer не знает, что данные находятся в JSON-файлах.

---

## 7. MVP0 — HTTP API

Использовать версионированный API: `/api/v1/*`.

### 7.1. List puzzles — [x]

`GET /api/v1/puzzles`

- Реализовать endpoint.
- Создать response DTO.
- Не возвращать лишние данные.
- Обработать server errors.
- Добавить HTTP tests.

### 7.2. Get puzzle — [x]

`GET /api/v1/puzzles/{id}`

- Реализовать endpoint.
- Вернуть puzzle DTO.
- Вернуть 404, если puzzle отсутствует.
- Обработать malformed/invalid request.
- Добавить HTTP tests.

### 7.3. API contract — [x]

- Зафиксировать JSON response examples.
- Обновить README/API documentation, если необходимо.
- Проверить frontend ↔ backend contract.

---

## 8. MVP0 — Frontend skeleton

### 8.1. Создать frontend module — [x]

Предпочтительная структура:

```
frontend/
├── src/
├── package.json
└── ...
```

- Выбрать минимальный frontend stack.
- Не добавлять UI framework/библиотеки без необходимости.
- Настроить dev build.
- Настроить production build.

### 8.2. Создать application shell — [x]

- Создать главную страницу.
- Создать базовую navigation.
- Добавить loading state.
- Добавить error state.
- Добавить API client.

---

## 9. MVP0 — First vertical slice

Это главная задача MVP0.

Пользователь должен пройти:

```
Open website
   ↓
Load puzzles
   ↓
Select puzzle
   ↓
GET /api/v1/puzzles/{id}
   ↓
Render puzzle
   ↓
See grid
```

- Frontend получает список puzzles через API.
- Frontend отображает список.
- Пользователь выбирает puzzle.
- Frontend загружает puzzle.
- Отображается grid.
- Отображаются row hints.
- Отображаются column hints.
- Размеры 5×5, 10×10, 15×15 и 20×20 корректно отображаются.

**MVP0 checkpoint**

- Backend запускается.
- Frontend запускается.
- API работает.
- Puzzle загружается из JSON.
- Puzzle отображается в браузере.
- Один полный vertical slice работает.

---

## MVP1 — Playable MVP

Цель MVP1 — получить полноценную игру:

```
Открыл
  ↓
Выбрал puzzle
  ↓
Начал решать
  ↓
Закрашиваешь / ставишь крестики
  ↓
Прогресс сохраняется
  ↓
Вернулся позже
  ↓
Продолжил
  ↓
Проверил
  ↓
Решил
  ↓
Увидел время
```

MVP должен соответствовать основному пользовательскому сценарию из product documentation ([GitHub](https://github.com/AlexSimanov1/nanograms/blob/main/%D0%9D%D0%B0%D0%BD%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%D1%8B.md)).

---

## 10. MVP1 — Game state

### 10.1. Реализовать состояние игрового поля

- Создать frontend representation PuzzleProgress.
- Создать grid заданного размера.
- При открытии нового puzzle создать пустое состояние.
- Поддержать empty.
- Поддержать filled.
- Поддержать marked.

### 10.2. Реализовать изменение клетки

Минимальные действия: `fill`, `mark`, `clear`.

- Реализовать fill.
- Реализовать mark.
- Реализовать clear.
- Обеспечить предсказуемые переходы состояний.
- Добавить tests для state transitions.

---

## 11. MVP1 — Desktop input

- Клик изменяет клетку.
- Реализовать удобный режим выбора действия.
- Не делать right-click обязательным механизмом.
- Реализовать явные действия Закрасить / Крестик / Очистить.
- Добавить keyboard support.
- Добавить visible focus states.

Главное правило:

Mobile UX не должен зависеть от desktop-only поведения.

---

## 12. MVP1 — Mobile input

Mobile UX является частью MVP.

- Проверить portrait.
- Проверить landscape.
- Реализовать touch tap.
- Реализовать переключение Закрасить / Крестик.
- Убедиться, что right-click нигде не требуется.
- Убедиться, что hover не нужен.
- Проверить размер клеток на 20×20.
- Реализовать drag по клеткам.
- Проверить, что drag не создаёт неожиданных изменений.

Не реализовывать пока:

- long press;
- haptic feedback;
- zoom/pan.

Они могут быть отложены.

---

## 13. MVP1 — Puzzle validation

### 13.1. Определить стратегию проверки

Перед реализацией решить архитектурный вопрос:

Кто проверяет решение — frontend или backend?

Требование MVP:

```
current state == solution
```

должно давать корректный результат ([GitHub](https://github.com/AlexSimanov1/nanograms/blob/main/%D0%9D%D0%B0%D0%BD%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%D1%8B.md)).

Агент должен:

- изучить текущий API;
- выбрать минимальное решение;
- не нарушить архитектурные границы;
- документировать решение.

**Важное ограничение**

Если solution передаётся frontend и это создаёт проблему с раскрытием ответа пользователю, агент не должен молча игнорировать проблему.

Необходимо либо:

1. явно принять это как MVP trade-off;
2. либо реализовать server-side check.

### 13.2. Реализовать проверку

- Сравнивать все клетки.
- Определять correct / incorrect.
- Не уничтожать текущий progress при ошибке.
- При correct переводить puzzle в completed.
- При correct фиксировать completion time.
- Добавить tests.

---

## 14. MVP1 — Progress persistence

Использовать browser storage.

Предпочтительно начать с `localStorage`.

- Определить storage key/version.
- Сериализовать PuzzleProgress.
- Сохранять автоматически.
- Загружать progress при открытии puzzle.
- Обрабатывать отсутствие progress.
- Обрабатывать повреждённый progress.
- Не ломать приложение из-за invalid localStorage data.

### 14.1. Persistence scenarios

Проверить:

- открыть puzzle;
- изменить несколько клеток;
- обновить страницу;
- состояние восстановилось;
- закрыть вкладку;
- открыть снова;
- состояние восстановилось;
- открыть другой puzzle;
- вернуться к предыдущему;
- состояние сохранилось отдельно.

---

## 15. MVP1 — Puzzle status

Для каждого puzzle поддержать: `not_started`, `in_progress`, `completed`.

- Определять not_started.
- Переводить в in_progress при начале решения.
- Переводить в completed после успешной проверки.
- Сохранять status.
- Показывать status в каталоге.
- Показывать Продолжить для in-progress puzzle.
- Показывать Решён для completed puzzle.

---

## 16. MVP1 — Timer

### 16.1. Timer model

Хранить: `startedAt`, `elapsedTime`, `completedAt`.

- Таймер запускается при начале решения.
- Таймер отображается в UI.
- Таймер не зависит от количества render cycles.
- Таймер корректно восстанавливается после reload.
- Таймер останавливается после completion.
- Итоговое время сохраняется.

### 16.2. Timer tests

Проверить:

- fresh puzzle;
- in-progress puzzle;
- reload;
- completed puzzle;
- browser tab закрыта/открыта заново;
- elapsed time не сбрасывается.

---

## 17. MVP1 — Reset

- Добавить действие Сбросить.
- Запрашивать подтверждение, если это необходимо для UX.
- Очищать все клетки.
- Не удалять сам puzzle.
- Корректно обновлять progress.
- Корректно обновлять timer/status.

---

## 18. MVP1 — Catalog

Главная страница должна показывать:

```
Puzzle
├── title
├── size
├── difficulty
└── status
```

- Отображать title.
- Отображать размер.
- Отображать difficulty.
- Отображать status.
- Показывать Начать.
- Показывать Продолжить.
- Показывать Решён.
- После completion корректно обновлять catalog.

---

## 19. MVP1 — Completion flow

После правильного решения:

- Показать completion state.
- Показать итоговое время.
- Остановить timer.
- Сохранить completed status.
- Не позволять случайно продолжить изменять завершённое решение без явного действия.
- Предложить следующий puzzle.
- Вернуться в catalog.

---

## 20. MVP1 — UX polish

### 20.1. Grid UX

- Активная клетка визуально различима.
- Filled state визуально различим.
- Marked state визуально различим.
- Empty state визуально различим.
- Состояния не передаются только цветом.
- Подсказки строк читаемы.
- Подсказки столбцов читаемы.
- Поле занимает большую часть доступного пространства.

### 20.2. Input mode

Пользователь всегда должен понимать текущий режим: **Закрасить** или **Крестик**.

- Mode selector существует.
- Активный режим очевиден.
- Переключение работает touch.
- Переключение работает mouse.
- Переключение работает keyboard.

---

## 21. MVP1 — Accessibility baseline

- Основные действия доступны с клавиатуры.
- Focus states видимы.
- Интерактивные элементы имеют понятные labels.
- Cell state не определяется только цветом.
- Контраст достаточен.
- Touch targets имеют разумный размер.

---

## 22. MVP1 — Error handling

**Frontend**

- API loading state.
- API error state.
- Puzzle not found.
- Invalid localStorage.
- Некорректные puzzle data.
- Пользователь не теряет progress из-за обычной ошибки загрузки.

**Backend**

- 404 для отсутствующего puzzle.
- Корректные HTTP status codes.
- Ошибки JSON не приводят к panic.
- Ошибки storage логируются.
- Server не падает из-за одного повреждённого puzzle.

---

## 23. MVP1 — Tests

**Backend**

- Domain tests.
- Puzzle validation tests.
- Repository tests.
- Application service tests.
- HTTP handler tests.
- Error cases.

**Frontend**

- Cell state transitions.
- Puzzle progress.
- Persistence.
- Timer.
- Puzzle completion.
- Reset.
- Catalog status.

**E2E / integration**

Минимальный сценарий:

```
Open
 ↓
Select puzzle
 ↓
Load grid
 ↓
Change cells
 ↓
Reload
 ↓
Progress restored
 ↓
Complete puzzle
 ↓
Completion shown
```

- Этот сценарий проходит целиком.

---

## 24. MVP1 — Docker

### 24.1. Production build — [x]

Архитектура MVP развёртывается одним `docker compose` с двумя сервисами:
frontend (nginx) и backend (Go API). Этот вариант согласован вместо
первоначального «единого контейнера» (см. Progress log).

Pipeline:

```
Frontend build (Vite)
      ↓
Static assets (dist)
      ↓
nginx (frontend service)
  ├── раздаёт статику
  └── proxy /api → backend
          ↓
Backend (Go API, /api/v1/*)
  └── data/puzzles
```

- `Dockerfile` (backend): multi-stage go build → minimal runtime; `data/puzzles` копируется в образ.
- `frontend/Dockerfile`: frontend build (node) → nginx.
- `frontend/nginx.conf`: раздача статики + proxy `/api` + SPA-fallback.
- nginx проксирует `/api` на backend через docker network (один публичный порт, без CORS).

### 24.2. Docker Compose — [x]

- Создать/обновить docker-compose.yml.
- docker compose up запускает приложение.
- Не требовать отдельного запуска frontend.
- Не требовать отдельного запуска backend.
- Не использовать database.
- Проверить fresh build.

**Acceptance criteria**

`docker compose up --build` → приложение доступно в браузере.

---

## 25. MVP1 — Final QA

**Desktop**

- 5×5.
- 10×10.
- 15×15.
- 20×20.
- Mouse input.
- Keyboard input.
- Reset.
- Check.
- Timer.
- Reload persistence.

**Mobile portrait**

- Catalog.
- Puzzle opening.
- Tap.
- Mode switching.
- Drag.
- Reset.
- Check.
- Timer.
- 20×20 usable.

**Mobile landscape**

- Catalog.
- Puzzle opening.
- Grid.
- Touch.
- Drag.
- 20×20 usable.

---

## 26. MVP1 — Release checklist

**Functional**

- Пользователь открывает сайт без регистрации.
- Пользователь видит каталог.
- Пользователь выбирает puzzle.
- Поддерживаются 5×5, 10×10, 15×15, 20×20.
- Видны row hints.
- Видны column hints.
- Можно закрашивать клетки.
- Можно ставить крестики.
- Можно очищать клетки.
- Можно проверить решение.
- Correct solution определяется.
- Incorrect solution не уничтожает progress.
- Таймер работает.
- Progress сохраняется.
- Progress восстанавливается.
- Completed puzzle отображается как решённый.
- Можно перейти к следующему puzzle.

**Mobile**

- Touch работает.
- Right click не требуется.
- Hover не требуется.
- Portrait работает.
- Landscape работает.
- 20×20 работает без zoom.

**Technical**

- `go test ./...` проходит.
- Frontend tests проходят.
- Production frontend build проходит.
- Docker build проходит.
- `docker compose up --build` проходит.
- Нет database.
- Нет server-side user state.
- Frontend взаимодействует с backend через HTTP API.
- Storage изолирован через repository boundary.

---

## 27. MVP0 Completion Gate

MVP0 можно считать завершённым только когда:

- Go backend запускается.
- JSON repository работает.
- API /api/v1/puzzles работает.
- API /api/v1/puzzles/{id} работает.
- Frontend запускается.
- Frontend получает puzzle через HTTP API.
- Catalog отображается.
- Puzzle page отображается.
- Grid отображается.
- 20×20 корректно загружается.
- Основные backend tests проходят.
- Основные frontend tests проходят.

После этого начинать MVP1.

---

## 28. MVP1 Completion Gate

MVP1 можно считать завершённым только когда пользователь может выполнить полный сценарий:

```
Открыть сайт
    ↓
Выбрать puzzle
    ↓
Начать решать
    ↓
Закрашивать клетки
    ↓
Ставить крестики
    ↓
Очищать клетки
    ↓
Закрыть страницу
    ↓
Вернуться
    ↓
Продолжить
    ↓
Закончить puzzle
    ↓
Проверить
    ↓
Получить completion result
    ↓
Увидеть время
    ↓
Перейти к следующему puzzle
```

И дополнительно:

- Desktop ✓
- Mobile portrait ✓
- Mobile landscape ✓
- 5×5 ✓
- 10×10 ✓
- 15×15 ✓
- 20×20 ✓

---

## 29. Что НЕ делать в MVP0/MVP1

Следующие задачи не должны появляться в этом roadmap без отдельного решения:

- Authentication.
- OAuth.
- User accounts.
- PostgreSQL.
- Redis.
- Server-side progress.
- Leaderboard.
- Social features.
- Comments.
- Likes.
- Daily puzzles.
- Streaks.
- Achievements.
- Puzzle generator.
- Puzzle editor.
- User-generated puzzles.
- AI.
- Native mobile application.
- Monetization.

---

## 30. Agent Progress Log

Агент должен добавлять сюда запись после завершения крупного этапа.

Формат:

```
## YYYY-MM-DD — Agent

Completed:

- MVP0 / 1.1
- MVP0 / 2.1

Tests:

- `go test ./...` — PASS

Notes:

- ...

Next:

- MVP0 / ...
```

**Progress**

<!-- AGENTS: append progress entries below this line -->

## 2026-08-28 — Agent

Completed:

- MVP1 / 13.1 — Определена стратегия проверки решения: **server-side check**.

Decision (13.1):

- Проверять решение будет **только backend**. `solution` намеренно никогда не отдаётся клиенту (зафиксировано в `API.md` и в `puzzleDetailDTO`), поэтому frontend физически не может выполнить `current state == solution` локально, а передавать ответ во frontend значило бы раскрывать его — что ROADMAP (13.1) запрещает молча игнорировать. Вариант «trade-off с раскрытием ответа» отклонён.
- Выбран вариант 2 ROADMAP: server-side check через новый endpoint `POST /api/v1/puzzles/{id}/check`.
- Контракт: запрос `{ "cells": [[bool,…],…] }` (сетка `height×width`, `true` = клетка закрашена/filled; крестики и пустые = `false`, т.к. крестик — аннотация игрока, не часть ответа). Ответ `{ "correct": bool }` без раскрытия решения.
- Коды: `200` — сверка, `400` — битый JSON/неверная размерность, `404` — puzzle не найден, `500` — внутренняя ошибка.
- Границы: домен `Puzzle.IsSolvedBy([][]bool)` (чистая логика), application `service.Check`, http — тонкий слой. `solution` остаётся на сервере.
- Реализация — задача MVP1 / 13.2.

Next:

- MVP1 / 13.2 — реализовать проверку (домен + application + http endpoint + тесты).

---

## 2026-08-28 — Agent

Completed:

- MVP1 / 12 — Mobile input (touch tap, переключение Закрасить / Крестик / Очистить, drag по клеткам, вёрстка под portrait/landscape и 20×20).

Tests:

- `npm test` (Vitest) — PASS: 15 тестов (чистая логика переходов не менялась).
- `npm run build` — PASS (10 модулей; `dist` пересобран).
- `docker compose build frontend && up` — PASS: `:8080` отдаёт свежий bundle `index-BUGVcufP.js`, `GET /` 200.
- `go test ./...` — PASS (backend не затронут).

Notes:

- **Drag по клеткам** реализован через Pointer Events (единый механизм для mouse/touch/pen): `pointerdown` (основная кнопка `button===0`) + `setPointerCapture` + `pointerenter`-во-время-дрэга красят закрашиваемую клетку; `pointerup`/`pointercancel`/`lostpointercapture` завершают штрих. `pointerenter` бьёт по элементу под указателем даже при захвате — так проводится непрерывная линия.
- **Требование «drag не создаёт неожиданных изменений»**: покраска только при зажатом указателе и основной кнопке; вторая точка мульти-тача игнорируется (`dragging`); right-click (`button 2`) игнорируется — правый клик и hover по-прежнему нигде не требуются.
- **CSS/mobile**: `.cell { touch-action:none; user-select:none; -webkit-tap-highlight-color:transparent }` — тап/дрэг рисует, а не скроллит/зумит страницу; `.puzzle-board { max-width:min(640px,100%) }` — доска вписывается в ширину экрана (раньше 640px переполняла телефоны); `@media (max-width:480px)` уменьшает подсказки, чтобы 20×20 был играбелен в portrait без zoom; кнопки тулбара крупнее (touch-target), `.button { touch-action:manipulation }` убирает double-tap-zoom.
- Тап (одиночный pointerdown) работает и на touch, и на мыши; клавиатурная навигация не тронута.
- Проверка drag — glue-логика в DOM-представлении (`puzzle.js`), чистая логика переходов уже покрыта `game.test.js`; jsdom-зависимость для теста DOM не добавлял (over-engineering для пет-проекта).
- Визуально проверить tap/drag на устройстве: `http://localhost:8080/` (контейнер пересобран).

Next:

- MVP1 / 13 — Puzzle validation (стратегия проверки решения frontend/backend + реализация).

---


Tests:

- `npm test` (Vitest) — PASS: 15 тестов (добавлены `applyAction`).
- `npm run build` — PASS (10 модулей).
- Docker frontend пересобран, на `:8080` отдаётся актуальный bundle, в нём присутствуют метки действий и навигация.

Notes:

- В `frontend/src/game.js` добавлен перечисляемый концепт действия `Action` (fill/mark/clear) и функция `applyAction(progress, action, r, c)` — отделяет выбор игрока от результирующего CellState, тестируем.
- `frontend/src/views/puzzle.js`: тулбар Закрасить/Крестик/Очистить (всегда виден, активный выделен, aria-pressed; горячие клавиши 1/2/3), клик по клетке применяет действие, keyboard-навигация стрелками с roving tabindex (одна таблируемая клетка, Space/Enter — действие). Такого рода input не требует right-click или hover (mobile-правило).
- Клетки обновляются точечно (`renderCell`) — класс, data-state и доступное имя («Ряд N, столбец M: …»), без перерисовки всей доски.
- Focus states: видимый `outline` через `:focus-visible`.
- Клетки editing на `completed` защищены на уровне домена (game.js), UI-блокировка завершённого — с flow завершения (19).

Next:

- MVP1 / 12 — Mobile input (touch, drag, portrait/landscape, размеры клеток 20×20).

---

## 2026-08-28 — Agent

Completed:

- MVP1 / 10.2 — изменение клетки (fill / mark / clear) + тесты переходов состояний.

Tests:

- `npm test` (Vitest) — PASS: 11 тестов (`frontend/src/game.test.js`).
- `npm run build` — PASS (10 модулей; тестовый код в production bundle не попадает).
- Docker / backend — не затронуты.

Notes:

- В `frontend/src/game.js` добавлены переходы: `fill` / `mark` / `clear` (иммутабельные — возвращают новый progress, не мутируют исходный). Общая внутренняя `setCell`: валидирует границы (throw при выходе за размеры), запрещает правку завершённого кроссворда, переводит `NOT_STARTED -> IN_PROGRESS` при первом изменении.
- UVIT подход согласован с пользователем и добавлен: dev-зависимость в `frontend/package.json`([vitest ^4.1.11]) + скрипт `npm test`. Тестовый модуль фактически подтверждается отсутствием Vitest-импортов в production-бандле.
- Новый `frontend/src/game.test.js` покрывает: создание пустого состояния, валидацию размеров, переходы fill/mark/clear, иммутабельность, смену статуса, out-of-bounds, отказ на completed.
- Клетки всё ещё не интерактивны в UI — ввод (клик/режим Закрасить/Крестик/Очистить) это задачи 11.x/frontend input. Логика переходов готова и покрыта тестами.

Next:

- MVP1 / 11 — Desktop input (клик изменяет клетку, режим выбора действия, keyboard/focus).

---

## 2026-08-28 — Agent

Completed:

- MVP0 / 9.x — First vertical slice (отображение доски) — подтверждено визуально через Docker.
- MVP1 / 10.1 — состояние игрового поля.

Tests:

- `npm run build` — PASS (10 модулей).
- `node --input-type=module` sanity-check модуля `game.js` — PASS (размеры, пустое состояние, валидация размеров, независимость строк).
- `go vet ./...`, `go test ./...` — PASS (backend не затронут).
- Docker `:8080` — PASS: `/` 200, API `/api/v1/puzzles` и `004` (20×20) отвечают, SPA отдаёт актуальный bundle.

Notes:

- **9.x**: заглушка страницы кроссворда заменена реальной отрисовкой nonogram-доски (corner + column hints сверху + row hints слева + grid `width×height`); коммит-подход как в каталоге (loading / error(«Повторить»), `createElement`/`textContent`, без `innerHTML`); клетки квадратные (`aspect-ratio`), доска ограничена 640px, чтобы 20×20 помещался.
- **10.1**: новый чистый модуль `frontend/src/game.js` — `CellState` (empty/filled/marked), `ProgressStatus` (not_started/in_progress/completed), `createEmptyProgress({width,height})` с валидацией размеров (без DOM-зависимости, детерминированный, тестируемый). `puzzle.js` при открытии кроссворда создаёт пустой прогресс и рендерит грид из состояния (`data-state` + класс `cell--filled`/`cell--marked`).
- Стили состояний: filled — заливка, marked — глиф «✕» (не только цвет, часть a11y).
- Клетки пока не интерактивны — ввод и переходы состояний это 10.2.

Next:

- MVP1 / 10.2 — изменение клетки (fill / mark / clear) + тесты переходов состояний. Потребуется вопрос о frontend-тест-раннере (в frontend сейчас только Vite, раннера нет).

---

## 2026-08-28 — Agent

Completed:

- MVP0 / 9.x — First vertical slice (отображение грида и подсказок).

Tests:

- `npm run build` — PASS (9 модулей; `dist/assets` пересобран).
- `go vet ./...`, `go test ./...` — PASS (backend не затронут).

Notes:

- Статическое отображение доски реализовано во `frontend/src/views/puzzle.js`: заглушка заменена реальной отрисовкой.
- Страница кроссворда: заголовок = title, мета-строка `WxH · difficulty`, компоновка nonogram (угол, column hints сверху, row hints слева, grid).
- Column hints выровнены по низу (ближние к полю значения снизу), row hints — по правому краю; grid — пустые клетки `width × height` (для 5×5…20×20), готов к MVP1.
- Сохранены паттерны каталога: loading / error(«Повторить») состояния, DOM строится через `createElement`/`textContent` без `innerHTML`.
- Клетки пока не интерактивны — state/input/философия игры в задачах 10.x+ (MVP1). Отрисовка проверена только сборкой; визуальную проверку в браузере и интерактивность делает следующий шаг (10.x).

Next:

- MVP1 / 10.1 — состояние игрового поля + 10.2 изменение клетки.

---

## 2026-08-28 — Agent

Completed:

- MVP0 / 7.3

Tests:

- Документация-only изменение (код не менялся). Примеры ответов сверены с фактическим поведением запущенного сервера на 8080.

Notes:

- API.md: зафиксирован HTTP-контракт (base /api/v1, application/json; GET /health; GET /api/v1/puzzles; GET /api/v1/puzzles/{id} + 404) с реальными примерами ответов и статус-кодами.
- Явно зафиксировано: solution никогда не возвращается; в списке нет hints.
- README.md: добавлена ссылка на API.md в раздел «Документация».
- Фронтенд ещё не существует (8.x); frontend↔backend контракт будет проверен в вертикальном срезе 9.x.

Next:

- MVP0 / 8.2 — создать application shell

---

## 2026-08-28 — Agent

Completed:

- MVP0 / 8.1

Tests:

- `npm run build` — PASS (в `frontend/dist` собран production bundle).
- `npm run dev` — PASS (Vite dev-server на :5173; proxy `/api` → :8080 проверен на живых ответах Go-backend).
- `go vet ./...`, `go test ./...` — PASS (backend не затронут).

Notes:

- Создан frontend module на стеке Vanilla JS + Vite (без UI-фреймворка): `frontend/package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/style.css`, `frontend/.gitignore`.
- dev-build (`vite`) и production-build (`vite build` → `dist/`) настроены.
- В `vite.config.js` настроен proxy `/api` → `http://localhost:8080`, чтобы в dev-режиме frontend обращался к Go-backend через API без CORS.
- Временный application shell в `main.js` (заголовок + контейнер) — каркас под 8.2.
- Примечание по окружению: npm подключён к внутреннему artifactory; на этой машине установка зависимостей требует `NODE_OPTIONS=--use-system-ca` (корпоративный CA в системной ключнице). Это локальная особенность, в коммит не фиксируется.
- Go-backend пока не раздаёт статику frontend — это задача 24.1 (Docker). Отображение (вертикальный срез) — 9.x.

Next:

- MVP0 / 8.2 — создать application shell

---

## 2026-08-28 — Agent

Completed:

- MVP0 / 8.2

Tests:

- `npm run build` — PASS (9 модулей; `dist/assets` пересобран: `index-BoADW8So.js`, `index-BuQvKpYq.css`).
- API через dev-прокси (:5173) — PASS: `/api/v1/puzzles` (200, 4 кроссворда), `/api/v1/puzzles/001` (200, hints без `solution`), `/api/v1/puzzles/999` (404).
- Модули приложения отдаются Vite корректно (200 для `/src/main.js`, `views/catalog.js`, `api.js`).
- `go vet ./...`, `go test ./...` — PASS (backend не затронут).
- Визуально в браузере подтверждено пользователем: каталог (4 карточки), переход на страницу кроссворда, «← К каталогу».

Notes:

- Реализован application shell (Vanilla JS, без фреймворка): API client (`src/api.js`), hash-роутер (`src/router.js`), представления каталога (`src/views/catalog.js`) и заглушки страницы кроссворда (`src/views/puzzle.js`), точка входа (`src/main.js`), расширены стили (`src/style.css`).
- Каталог рендерит список из API с loading / error(«Повторить») / empty состояниями; клик по карточке → `#/puzzles/{id}`.
- Все элементы DOM строятся через `createElement` + `textContent` (без `innerHTML` с данными из API).
- Grid, hints и проверка решения — задача 9.x.
- Политика запуска: без явного разрешения пользователя `go run`/`npm run` не запускались; `npm run build` пользователь разрешил выполнять мне.

Next:

- MVP0 / 9.x — First vertical slice (отображение грида, выбор puzzle)

---

## 2026-08-28 — Agent

Completed:

- MVP1 / 24.1
- MVP1 / 24.2

Tests:

- `docker compose up --build` — PASS (образы `nanograms-backend`, `nanograms-frontend` собраны).
- curl через :8080 — PASS: `/` (200 HTML, bundle `index-BoADW8So.js`), `/api/v1/puzzles` (200, 4 кроссворда), `/api/v1/puzzles/001` (200, без `solution`), `/api/v1/puzzles/999` (404), SPA-fallback на несуществующий путь (200 text/html), JS/CSS ассеты (application/javascript, text/css).
- Визуально в браузере подтверждено пользователем: каталог, переход на кроссворд, «← К каталогу».
- `go test ./...`, `go vet ./...` — PASS (код backend не менялся).

Notes:

- Вместо задокументированного «единого контейнера» (текст 24.1) выбрана и согласована с пользователем двух-сервисная схема: frontend (nginx + dist, публичный порт 8080, proxy `/api` → backend) + backend (Go API, наружу не публикуется). Браузер ходит в один адрес без CORS; Go-сервер статику не раздаёт, остаётся чистым API.
- Добавлены: `Dockerfile` (backend, multi-stage go→alpine), `frontend/Dockerfile` (node build → nginx), `frontend/nginx.conf` (static + `/api` proxy + SPA-fallback), `docker-compose.yml`, `.dockerignore`.
- Особенность окружения: хостовый `package-lock.json` пинит tarball-URL'ы на корпоративный artifactory, а в контейнере его CA недоступен. В `frontend/Dockerfile` применён `sed`, переписывающий `resolved` на `registry.npmjs.org` внутри образа (исходный lock на хосте не тронут; dev на artifactory работает).
- README.md: раздел «Запуск» обновлён на `docker compose up` (два сервиса, один публичный порт).

Next:

- MVP0 / 9.x — First vertical slice (отображение грида, hints, выбор puzzle). До конца MVP1 остаются задачи 10–23.

---

## 31. Agent Handoff Protocol

Если один агент заканчивает работу и следующий должен продолжить:

Завершивший агент обязан:

- Обновить task checkboxes.
- Обновить Progress log.
- Описать незавершённые проблемы.
- Описать failing tests, если они есть.
- Не оставлять незакоммиченные изменения без объяснения.
- Указать следующую рекомендуемую задачу.

Следующий агент обязан:

- Прочитать ROADMAP.md.
- Прочитать последний Progress log.
- Проверить git status.
- Проверить последние изменения.
- Проверить выполненные acceptance criteria.
- Продолжить с первой незавершённой задачи, если нет блокеров.

---

## 32. Главный принцип разработки

Не пытаться построить весь продукт сразу.

Приоритет:

```
Работает
  ↓
Корректно
  ↓
Удобно
  ↓
Красиво
  ↓
Оптимизировано
```

Главный пользовательский сценарий важнее инфраструктуры:

```
open → choose → solve → save → return → finish
```

Если новая задача не помогает этому сценарию или не создаёт необходимую техническую основу для него, она должна быть отложена.

---

## 33. Definition of MVP

MVP — это не «в проекте есть backend + frontend + Docker».

MVP — это момент, когда человек может открыть Nanograms, выбрать японский кроссворд до 20×20, удобно решить его на desktop или mobile, закрыть страницу, вернуться позже, продолжить решение, проверить ответ и увидеть результат.
