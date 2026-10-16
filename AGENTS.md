# AGENTS.md

Рабочие правила проекта для ИИ-агентов (Claude Code и других).

## Проект

«Календарь звонков» — сервис бронирования звонков (учебный проект Хекслета). Не переименовывайте репозиторий и не трогайте `.github/workflows/hexlet-check.yml` (от него зависят автотесты Хекслета).

## Архитектура

Монорепозиторий из двух приложений, которые поставляются как **один jar-файл Spring Boot**, и API-контракта между ними:

- `backend/` — Spring Boot 4.1 (Java 25, Maven wrapper), пакет `com.example.calhexlet`. REST-контроллеры лежат под префиксом `/api`.
- `frontend/` — React 19 + TypeScript + Vite 8 + Tailwind 4 + shadcn/ui (стиль `base-nova`, основан на `@base-ui/react`; компоненты добавляются через `npx shadcn add`, алиасы — в `components.json`). Алиас `@` указывает на `frontend/src`.
- `contract/` — API-контракт на TypeSpec (подход Design First, единственный источник правды на границе фронтенда и бэкенда): `main.tsp` → `openapi.yaml` (OpenAPI 3.0.0). В jar не входит. См. `docs/adr/0003-contract-in-repo-root.md`.

Как они связаны:
- **Разработка:** dev-сервер Vite проксирует `/api` → `http://localhost:8080` (`frontend/vite.config.ts`). Запускайте оба сервера отдельно.
- **Сборка:** `backend/pom.xml` через `frontend-maven-plugin` устанавливает Node (`node.version`), выполняет `npm ci` и `npm run build`, а затем `maven-resources-plugin` копирует `frontend/dist` в `static/` внутри jar. То есть `./mvnw package` собирает всё приложение целиком. Чтобы пропустить шаги с Node, когда `frontend/dist` уже собран, передайте `-Dskip.installnodenpm -Dskip.npm` (так делает Dockerfile).
- **Docker:** многостадийный `Dockerfile` (сборка фронтенда на Node → сборка JDK/Maven со слоёным jar → рантайм на JRE от непривилегированного пользователя). Порт сервера берётся из `$PORT` (по умолчанию 8080).

Вызовы API на фронтенде идут через `frontend/src/lib/api.ts` (обычный `fetch`, при ошибке возвращает `null`).

## Команды

Backend (из каталога `backend/`):
- `./mvnw spring-boot:run` — запуск API на :8080
- `./mvnw test` — все тесты (учтите: через pom запускается сборка фронтенда, если не передать `-Dskip.installnodenpm -Dskip.npm`)
- `./mvnw test -Dtest=HelloControllerTest#helloReturnsGreetingAsJson` — один тест
- `./mvnw checkstyle:check` — линтер (конфиг `backend/checkstyle.xml`, проверяет и тестовые исходники; существующие Java-файлы набраны с отступами табами)

Frontend (из каталога `frontend/`; версия Node — в корневом `.nvmrc`):
- `npm run dev` — dev-сервер Vite
- `npm run lint` / `npm run typecheck` / `npm test` (vitest, jsdom)
- `npx vitest run src/App.test.tsx -t "название"` — один тест
- `npm run format` — Prettier (с плагином сортировки классов Tailwind)
- `npm run build` — `tsc -b && vite build`

Contract (из каталога `contract/`; Node — тот же корневой `.nvmrc`):
- `npm ci` — установить TypeSpec (точные версии `@typespec/*` без `^` и `~`, `package-lock.json` закоммичен)
- `npx tsp compile .` — сгенерировать `openapi.yaml` из `main.tsp`
- `npm run check` — `tsp compile . --warn-as-error` и `tsp format --check "**/*.tsp"` (то же, что в CI)
- `npm run format` — отформатировать `.tsp`

**`contract/openapi.yaml` руками не править.** Файл сгенерирован и коммитится: правка пропадёт при следующей генерации, а CI (задача `contract`) упадёт, если закоммиченный файл не совпадает с результатом `tsp compile`. Меняйте `main.tsp`, перегенерируйте и коммитьте оба файла вместе. `.tsp` удобно править в VS Code с расширением TypeSpec. Обновление TypeSpec — осознанный шаг: поднять версии, перегенерировать, закоммитить `openapi.yaml`.

Версия Node одна на весь репозиторий: корневой `.nvmrc`. `<node.version>` в `backend/pom.xml` и тег `node:` в `Dockerfile` читать файл не умеют и должны совпадать с ним вручную; расхождение роняет CI (задача `node-version`).

CI (`.github/workflows/ci.yml`, на каждый push) запускает: для backend — `checkstyle:check` и `mvnw test`; для frontend — `npm run lint -- --max-warnings=0`, `typecheck`, `test`; для контракта — `tsp compile --warn-as-error`, `tsp format --check` и проверку, что закоммиченный `openapi.yaml` свеж; плюс сверку версий Node. Любое предупреждение ESLint роняет CI.

## Соглашения

- Тесты backend написаны на `@WebMvcTest` + `MockMvcTester` (пакет Spring Boot 4 `org.springframework.boot.webmvc.test.autoconfigure`).
- **Формат коммитов — Conventional Commits, всегда, включая коммиты агента:** `<тип>(<область>): <описание>`, где тип — `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore` и т. п. (например, `feat: add booking form`, `fix(ci): use GITHUB_TOKEN`). Ломающее изменение — `feat!:` или футер `BREAKING CHANGE:`. `release-please` по этим сообщениям формирует `CHANGELOG.md`, релизные PR и версию — не правьте changelog и версию вручную.

## Agent skills

### Issue tracker

Задачи ведутся в GitHub Issues (`gh` CLI). См. `docs/agents/issue-tracker.md`.

### Triage labels

Стандартный словарь: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Single-context: один `CONTEXT.md` и `docs/adr/` в корне репозитория. См. `docs/agents/domain.md`.
