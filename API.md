# API

HTTP API Nanograms. Версия: `v1`.

Все ответы — `application/json`.

Базовый путь всех методов: `/api/v1`.

## Контракт и ограничения

- **`solution` никогда не возвращается клиенту** — ответ каждого puzzle не раскрывается.
- В списке puzzles (`/puzzles`) не отдаются подсказки — только сведения для каталога.

---

## `GET /health`

Проверка живости сервера.

**Example response — `200 OK`**

```json
{
  "status": "ok"
}
```

---

## `GET /api/v1/puzzles`

Список доступных puzzles (для каталога).

**Example response — `200 OK`**

```json
{
  "puzzles": [
    { "id": "001", "title": "Cross",   "width": 5,  "height": 5,  "difficulty": "easy" },
    { "id": "002", "title": "Frame",   "width": 10, "height": 10, "difficulty": "medium" },
    { "id": "003", "title": "Diamond", "width": 15, "height": 15, "difficulty": "medium" },
    { "id": "004", "title": "Star",    "width": 20, "height": 20, "difficulty": "hard" }
  ]
}
```

**Errors**

| Code | Meaning |
|---|---|
| `500` | внутренняя ошибка сервера |

---

## `GET /api/v1/puzzles/{id}`

Один puzzle для игры: размеры и подсказки строк/столбцов. `solution` отсутствует намеренно.

**Example request**

```
GET /api/v1/puzzles/001
```

**Example response — `200 OK`**

```json
{
  "id": "001",
  "title": "Cross",
  "width": 5,
  "height": 5,
  "difficulty": "easy",
  "rowHints": [[1,1],[1,1],[1],[1,1],[1,1]],
  "columnHints": [[1,1],[1,1],[1],[1,1],[1,1]]
}
```

**Errors**

| Code | Meaning |
|---|---|
| `404` | puzzle не найден |
| `500` | внутренняя ошибка сервера |

**Example error — `404 Not Found`**

```json
{
  "error": "puzzle not found"
}
```
