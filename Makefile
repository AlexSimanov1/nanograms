# Единая точка входа для запуска/сборки проекта.
# Требуется только Docker — npm/go на хосте не нужны: всё собирается внутри контейнеров.

.PHONY: up down build logs

# Собрать и запустить всё приложение (http://localhost:8080).
up:
	docker compose up --build

# Остановить и удалить контейнеры/сеть.
down:
	docker compose down

# Только пересобрать образы, не запуская.
build:
	docker compose build

# Логи всех сервисов.
logs:
	docker compose logs -f
