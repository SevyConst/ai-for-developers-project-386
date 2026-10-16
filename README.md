# Календарь звонков


[![hexlet-check](https://github.com/SevyConst/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/SevyConst/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## О сервисе

Сервис бронирования звонков. Владелец календаря создаёт типы событий (название, описание, длительность), Гость без регистрации выбирает тип события и свободный слот в ближайшие 14 дней по московскому времени и бронирует его, оставив только имя. Владелец видит предстоящие звонки в Админке.

Сервис в разработке: сейчас готовы каркас приложения, API-контракт и генерация кода по нему, а сами экраны и эндпоинты делаются по [спецификации](https://github.com/SevyConst/ai-for-developers-project-386/issues/23) и плану раздельной реализации фронтенда и бэкенда (`docs/plan/split.md`).

## Стек

- **Бэкенд:** Java 25, Spring Boot 4.1, Maven.
- **Фронтенд:** React 19, TypeScript, Vite 8, Tailwind 4, shadcn/ui.
- **API-контракт:** TypeSpec → OpenAPI 3.0 (подход Design First: контракт лежит в `contract/` и задаёт границу между фронтендом и бэкендом).
- **Поставка:** Docker-образ; внутри один jar Spring Boot со встроенным фронтендом.

## Установка

```bash
git clone https://github.com/SevyConst/ai-for-developers-project-386.git
cd ai-for-developers-project-386
```

Для запуска в контейнере нужен только [Docker](https://docs.docker.com/get-docker/). Для локальной разработки нужны JDK 25 и Node той версии, что записана в `.nvmrc` (Maven wrapper лежит в репозитории).

Переменная окружения: `PORT` — порт сервера (по умолчанию 8080).

## Использование

### Запуск в Docker

```bash
docker build -t calhexlet .
docker run --rm -p 8080:8080 calhexlet
```

Приложение откроется на http://localhost:8080. Другой порт: `docker run --rm -e PORT=9090 -p 9090:9090 calhexlet`.

### Локальная разработка

Бэкенд и фронтенд запускаются отдельно (dev-сервер Vite проксирует `/api` на бэкенд):

```bash
# бэкенд, порт 8080
cd backend && ./mvnw spring-boot:run

# фронтенд, в другом терминале
cd frontend && npm ci && npm run dev
```

Фронтенд без бэкенда, с моком API: `npm run dev:mock` (из `frontend/`).

### Контракт и генерация кода

Клиент для фронтенда и серверные интерфейсы бэкенда генерируются из `contract/openapi.yaml`. После правки `contract/main.tsp` всю цепочку (контракт → клиент → интерфейсы) обновляет одна команда из корня репозитория; перед первым запуском выполните `npm ci` в `contract/` и `frontend/`:

```bash
./scripts/generate.sh
```

`contract/openapi.yaml` сгенерирован, руками его не правят.

### Тесты и проверки

```bash
cd backend && ./mvnw test && ./mvnw checkstyle:check
cd frontend && npm test && npm run lint && npm run typecheck
cd contract && npm run check
```

<!-- Добавьте запись asciinema с запуском — именно это смотрит работодатель -->

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
