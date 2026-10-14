# Потребление OpenAPI: фронтенд, бэкенд, мок-сервер, контрактные тесты

Исследование к тикету #13 (карта #10). Дата: 2026-10-14. Ничего не внедрялось: код приложения, `pom.xml`, `package.json` и CI не менялись. Эксперименты шли в песочнице вне репозитория, на синтетической спецификации (см. [приложение](#приложение-как-проверялось)).

Вопрос тикета: чем потреблять сгенерированный OpenAPI на каждой стороне и как работать фронтенду без готового бэкенда (и наоборот).

## Как читать ссылки на проверку

- **[док]**: утверждение взято из официальной документации или README инструмента.
- **[реестр]**: данные npm-реестра (`npm view`), Maven Central или PyPI на 2026-10-14.
- **[репо]**: репозиторий или релизы на GitHub (API `gh`), тоже на 2026-10-14.
- **[опыт]**: проверено запуском в песочнице (версии указаны). Как воспроизвести: в разделе «Приложение».
- **[?]**: подтвердить не удалось. Собрано в разделе [«Не подтверждено»](#не-подтверждено-и-не-проверялось).

Номера `[Sn]` ведут в [список источников](#источники).

## Коротко

1. **Контракт лучше отдавать потребителям в OpenAPI 3.0.x.** TypeSpec по умолчанию выдаёт именно `3.0.0` [S19]. Все проверенные инструменты читают 3.0 и 3.1. Исключение: `openapi-generator` 7.26.0 не читает `3.2.0` вообще и помечает 3.1 как beta [опыт, S16].
2. **Фронтенд-клиент.** По живости и совместимости с TypeScript выигрывает **Orval 8.42.0**. `openapi-typescript` + `openapi-fetch` (легче по коду) последний раз выпускался 2026-02-11, не ставится на проект с `typescript ~6` без обхода peer-зависимости и падает на TypeScript 7. **Hey API 0.99.0** ещё до 1.0 с частыми ломающими изменениями и тоже падает на TypeScript 7.
3. **Бэкенд.** `openapi-generator-maven-plugin` 7.26.0, генератор `spring`, режим `interfaceOnly`, опции `useSpringBoot4` и `useJackson3`: собралось и прошло тесты на Spring Boot 4.1.1 (`--release 25`) [опыт]. Проверка контракта в тестах: `openapi-request-validator-mockmvc` 3.0.0 (бывший `swagger-request-validator`), работает с `MockMvcTester`.
4. **Мок-сервер.** Для сценариев со состоянием (`Booking` занимает `Slot`, повторная попытка получает 409, пагинация) подходит **MSW 3** (обработчики из Orval как база или `openapi-msw`, но он требует `openapi-typescript`). **Prism** отвечает статическими заготовками и не помнит состояния, зато проверяет запросы и умеет работать «прокси с подменой 501».
5. **Раздельная работа без блокировок** реально работает так: сгенерированные интерфейсы Spring по умолчанию отвечают 501, а Prism в режиме `proxy` на 501 подставляет мок. Проверено запуском [опыт, S12].

## Контекст проекта (что накладывает ограничения)

| Что | Значение | Источник |
| --- | --- | --- |
| Backend | Spring Boot 4.1.1, Java 25, Maven wrapper (Maven 3.9.16) | `backend/pom.xml`, `maven-wrapper.properties` |
| Spring Boot 4.1.1 | Java 17 и выше, совместим до Java 26 включительно; Spring Framework 7.0.9+ | [док, S18] |
| Frontend | React 19, Vite 8.3.4, TypeScript 6.0.3 (в lock-файле, в `package.json` `~6`), Vitest 5.0.4 | `frontend/package-lock.json` |
| Node | 24.21.0 (`.nvmrc`, `pom.xml`, `Dockerfile`) | репозиторий |
| TypeScript-флаги | `strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters` | `frontend/tsconfig.app.json` |
| Линтеры | ESLint с `--max-warnings=0`; Checkstyle по `src/main` и `src/test` | `ci.yml`, `AGENTS.md` |
| Сборка | `frontend-maven-plugin` привязан к `generate-resources` [опыт, `help:describe`]; `./mvnw test` собирает и фронтенд | `pom.xml`, `AGENTS.md` |
| Docker | стадия фронтенда копирует только `frontend/`, стадия бэкенда только `backend/` и `frontend/dist`; `.dockerignore` исключает `docs` | `Dockerfile`, `.dockerignore` |

Актуальные «последние» версии на сегодня: TypeScript **7.0.2** (`latest` в npm), Vite 8.3.4, MSW **3.0.3** (вышел 2026-09-28), Spring Boot 4.1.1 [реестр]. Проект закреплён на TypeScript 6, но 7 уже стабильный: совместимость с ним важна как запас на будущее.

Аналогия для Java-разработчика: генератор клиента из OpenAPI ≈ `openapi-generator` для Feign/RestClient; MSW ≈ WireMock/`MockRestServiceServer`; Prism ≈ WireMock со стабами, собранными из OpenAPI.

## Какую версию OpenAPI примут потребители

TypeSpec: опция эмиттера `openapi-versions` принимает `3.0.0`, `3.1.0`, `3.2.0`, по умолчанию `["3.0.0"]` [док, S19].

| Инструмент | Заявлено | Проверено [опыт] |
| --- | --- | --- |
| openapi-typescript 7.13.0 | «OpenAPI 3.0 and 3.1» [док, S1] | 3.0 и 3.1 генерируются; простой `3.2.0` принят |
| Orval 8.42.0 | «any valid OpenAPI v3 or Swagger v2» [док, S8] | 3.0, 3.1 и простой `3.2.0` генерируются |
| Hey API 0.99.0 | «accepts any OpenAPI specification» [док, S11]; в исходниках парсеры `2.0.x`, `3.0.x`, `3.1.x` [репо, S10] | 3.0, 3.1 и простой `3.2.0` генерируются |
| openapi-generator 7.26.0 | «3.0, 3.1 (beta support)» [док, S16] | 3.0 ок; 3.1 ок, но в логе `[WARNING] OpenAPI 3.1 support is still in beta`; **`3.2.0` не читается** (`failed to read resource listing`) |
| openapi-request-validator 3.0.0 | «OpenAPI 3.0.x и 3.1.x» [док, S17] | 3.0, 3.1 и простой `3.2.0` принимаются |
| Prism 5.16.0 | «OpenAPI v3.1, v3.0, v2.0» [док, S12] | `mock` на 3.1 и простом `3.2.0`, `proxy` на 3.0 работают |
| @msw/source 0.7.0 | «OpenAPI 2.0 and 3.0» [док, S15] | не запускали; про 3.1 документация молчит [?] |

Вывод: «простой документ с заголовком 3.2.0 проходит» не значит, что поддерживаются возможности 3.2. Это не проверялось [?]. Безопасная цель для потребителей: **3.0.0** (по умолчанию в TypeSpec), 3.1.0 допустим, но со статусом beta у серверного генератора.

## 1. Фронтенд: типы и клиент из OpenAPI

Проверялись три кандидата. Каждый прогонялся на одной и той же синтетической спецификации (3.0 и 3.1) и выход проверялся `tsc` с флагами проекта плюс `noUncheckedIndexedAccess`, затем ESLint с конфигом проекта.

| | openapi-typescript 7.13.0 + openapi-fetch 0.17.0 | Orval 8.42.0 | Hey API `@hey-api/openapi-ts` 0.99.0 |
| --- | --- | --- | --- |
| Последний релиз [реестр] | 2026-02-11 | 2026-10-13 (8.0.0 вышел 2026-01-14, с тех пор 42 минорных) | 2026-06-22 (дальше только `next`-сборки до 2026-09-30) |
| Живость [репо] | с 2026-02-12: 149 коммитов, из них 142 от ботов (renovate, dependabot) и 7 от людей (2 из них от `drwpow`); открыто 286 issues и PR | последний пуш 2026-10-14; открыто 13 issues и PR | коммиты редкие (в сентябре один, последний 2026-09-30); открыто 656 issues и PR |
| Стабильность API | 0.x у `openapi-fetch`, 7.x у генератора | 8.x | до 1.0; миграционные заметки к каждому релизу, за v0.90 → v0.99 несколько ломающих изменений [док, S11] |
| Node | без ограничений в `engines` | `>=22.18.0` | `>=22.18.0` |
| Peer на TypeScript [реестр] | `^5.x` | нет | `>=5.5.3 \|\| >=6.0.0 \|\| 6.0.1-rc` |
| `npm install` с TypeScript `~6` [опыт] | **ERESOLVE**, нужен `--legacy-peer-deps` или `overrides` | чисто | чисто |
| Генерация на TypeScript 6.0.3 [опыт] | работает | работает | работает |
| Генерация на TypeScript 7.0.2 [опыт] | **падает**: `Cannot read properties of undefined (reading 'createKeywordTypeNode')`; issues [S5], [S6], PR с поддержкой TS 6/7 висят открытыми | работает; выход проходит `tsc` 7.0.2 | **падает**: `reading 'AnyKeyword'`; issue «TypeScript 7 support» открыт [S11] |
| `tsc` с флагами проекта [опыт] | чисто (`erasableSyntaxOnly`: нет `enum`, только union-типы) | чисто (перечисления как `as const`-объекты) | чисто (union-типы) |
| ESLint проекта, `--max-warnings=0` [опыт] | 0 замечаний | 0 замечаний | **4 ошибки** `no-explicit-any` в сгенерированном рантайме клиента: нужен `globalIgnores` |
| Что попадает в `src/` | только `schema.ts` (типы) | функции-запросы (`createBooking(body)`) и модели; без рантайм-зависимостей кроме `fetch` | типы, SDK и 12 файлов рантайм-клиента (`core/`, `client/`) |
| Рантайм в бандле Vite 8.3.4 [опыт] | ~9,3 КБ (клиент `openapi-fetch` + вызов) | ~1,0 КБ | ~13,8 КБ |
| Генерация моков | нет; но есть `openapi-msw` (типизированные обработчики) [S14] | да: MSW-обработчики + Faker [док, S9] | плагины `msw` и `@faker-js/faker`, оба в статусе «In Progress» [док, S11] |
| `npm audit` после установки [опыт] | 0 | 0 | **4 high** (`js-yaml` ≤ 4.3.1 через `@hey-api/json-schema-ref-parser`); build-time инструмент |

Плюсы и минусы:

- **openapi-typescript + openapi-fetch.** Плюсы: самый тонкий слой (в `src/` один файл типов, клиент в виде `client.POST("/path", ...)` с автодополнением путей); `data` / `error` типизированы по кодам ответа (в эксперименте `error` на 409 получил тип схемы ошибки); совместим с `openapi-msw`. Минусы: поддержка фактически застыла (последний релиз в феврале, TS 6 и 7 не поддержаны, `ERESOLVE` сегодня); нужно помнить обход peer-зависимости; пути строками, не вызовы методов (для Java-разработчика менее привычно).
- **Orval.** Плюсы: самый живой проект; работает с TS 6 и 7; из одного места получаем модели, функции-запросы и MSW-обработчики; выход чистый для `tsc` и ESLint проекта; в бандл почти ничего не добавляет. Минусы: много настроек и транзитивных зависимостей; генерация исполняется на Node `>=22.18` (у проекта 24.21); моки на Faker случайны и без состояния (см. раздел про мок-серверы).
- **Hey API.** Плюсы: гибкая плагинная система, плагин Vite заявляет поддержку Vite 5–8 [док, S11]. Минусы: до 1.0 с частыми ломающими изменениями (рекомендация самих авторов закреплять точную версию); падает на TypeScript 7; сгенерированный рантайм копируется в `src/` и ломает ESLint проекта; плагин `msw` пока «In Progress». На сегодня не рекомендуется.

Vite 8.3.4 собрал вывод всех трёх (lib-режим, минификация) без ошибок [опыт]. Для Vite важен только рантайм; генераторы работают до сборки и Vite не касаются.

## 2. Бэкенд: серверные интерфейсы и модели из OpenAPI

Проверялся `openapi-generator-maven-plugin` **7.26.0** (релиз 2026-10-06; предыдущие 7.25.0 от 2026-08-24, 7.24.0 от 2026-07-20, то есть примерно раз в 6 недель) [репо, S16], генератор `spring`, режим `interfaceOnly`.

Что нужно знать про Spring Boot 4:

- Опции `useSpringBoot4` и `useJackson3` появились в **7.20.0** (2026-02-16); их нет в 7.19.0 [репо, S16]. `useJackson3` разрешён только вместе с `useSpringBoot4`.
- В 7.22.0 заявлено, что `openApiNullable` теперь работает вместе с `useJackson3` [репо, S16]. Но при `openApiNullable=true` (значение по умолчанию) в режиме `interfaceOnly` сборка падает: модели импортируют `org.openapitools.jackson.nullable.*`, а такого пакета в classpath нет (pom режим `interfaceOnly` не создаёт) [опыт]. Решение: `openApiNullable=false`. Заработает ли вариант с добавленной библиотекой `jackson-databind-nullable` на Jackson 3, не проверялось [?].
- `useSpringBoot3` по умолчанию `true`; для Boot 4 его не нужно задавать, достаточно `useSpringBoot4=true` [док, S16].

Рабочая конфигурация, которая собралась и прошла тесты на Spring Boot 4.1.1 при `java.version=25` (локальный JDK 26.0.2.1 с `--release 25`) [опыт]:

```xml
<generatorName>spring</generatorName>
<configOptions>
  <interfaceOnly>true</interfaceOnly>
  <useSpringBoot4>true</useSpringBoot4>
  <useJackson3>true</useJackson3>
  <useTags>true</useTags>
  <openApiNullable>false</openApiNullable>
  <documentationProvider>none</documentationProvider>
  <annotationLibrary>none</annotationLibrary>
  <hideGenerationTimestamp>true</hideGenerationTimestamp>
</configOptions>
```

Дополнительная зависимость только одна: `spring-boot-starter-validation` (сгенерированный код использует `jakarta.validation`). Остальное даёт Spring Boot.

Что получилось [опыт]:

- Интерфейс (`DefaultApi` без тегов, при тегах TypeSpec будет по интерфейсу на тег) с `@RequestMapping` на методах, `@Valid`, `@Min`/`@Max`, `@PathVariable`; контроллер просто `implements`. Параметры и ограничения (`pattern`, `minimum`, `default`) перенесены.
- Модели: мутабельные POJO с сеттерами (не `record`), `@NotNull` на обязательных полях; `format: date-time` даёт `OffsetDateTime`, `format: date` даёт `LocalDate`.
- Если не задавать `skipDefaultInterface`, методы интерфейса получают **default-реализацию, которая отвечает 501** (эта механика ниже используется для раздельной работы). Для компиляции в этом режиме нужны вспомогательные файлы (`generateSupportingFiles=true`, класс `ApiUtil`). С `skipDefaultInterface=true` и без вспомогательных файлов получаются чистые интерфейсы без реализации.

Ловушки, найденные при проверке [опыт]:

- Схема с именем `Error` даёт модель `exp.api.model.Error`, перекрывающую `java.lang.Error` (на стороне TypeScript у Orval и Hey API такой же конфликт с глобальным `Error`). Лучше назвать иначе в контракте.
- Сгенерированный код использует `org.springframework.lang.Nullable`; `javac` с `showDeprecation` сообщает: `org.springframework.lang.Nullable ... has been deprecated` (11 предупреждений на пять небольших схем и пять операций). Предупреждения не ломают сборку, но шумят.
- **Checkstyle проекта падает на сгенерированных исходниках**, если запустить `generate-sources checkstyle:check` в одном вызове Maven (звёздные импорты, неиспользуемые импорты). Отдельный вызов `./mvnw checkstyle:check`, как в `ci.yml`, генерацию не запускает и проверяет только `src/`. Если когда-нибудь объединят в `verify`, потребуется исключение каталога генерации.
- `dependency:go-offline` (как в `Dockerfile`) с плагином генератора и валидатором проходит [опыт].
- Генератор помечает в логе 3.1 как beta и печатает предупреждения про новые опции (`generateJsonIncludeAnnotations` и другие): конфиг будет «шуметь» при обновлениях.

Альтернативы бэкенду, о которых нужно знать, но которые не нужны в начале:

- **Только модели** (`generateApis=false`, свои контроллеры): снимает риск «интерфейс диктует сигнатуры», но теряет контроль, что контроллер реализует всё. Выбор остаётся для следующих тикетов [?].
- **springdoc-openapi 3.1.1** (2026-09-06) для Boot 4 [S20]: это путь code-first (OpenAPI из кода). Годится разве что для проверки «дрейфа» контракта; как источник истины не подходит, потому что источник истины у нас контракт.
- У самого TypeSpec в репозитории нет серверного эмиттера для Java (есть `http-client-java`, `http-server-js`, `http-server-csharp`) [репо, S19].

### Проверка контракта в тестах: openapi-request-validator

Бывший `swagger-request-validator`. С версии 3.0.0 (Maven Central, 2026-05-13) проект переименован, артефакты стали `com.atlassian.oai:openapi-request-validator-*`; старые отдают relocation на новые. Репозиторий переехал с Bitbucket на GitHub 2026-05-15 [док, репо, S17].

Проверено [опыт, версия 3.0.0, Spring Boot 4.1.1]:

- Модуль `openapi-request-validator-mockmvc` («Spring 7+ MVC Test Framework») подключается как тестовая зависимость. Интеграция написана под `MockMvc` + `ResultMatcher`, а в проекте используется `MockMvcTester`. Это решается одной строкой: `openApi().isValid(validator).match(result.getMvcResult())` на результате `MockMvcTester`. Все тесты прошли на 3.0, 3.1 и простом `3.2.0`.
- Проверяет **и запрос, и ответ**. Негативный случай: запрос без обязательных полей, на который сервер ответил 400 (его нет в контракте), дал три ERROR: два `validation.request.body.schema.required` и `validation.response.status.unknown` («Response status 400 not defined for path '/api/bookings'»). То есть валидатор требует, чтобы контракт описывал и ошибочные ответы, иначе тест падает.
- Валидация параметров на стороне сервера (`@Min` на `page=0`) бросила `ConstraintViolationException`, и `MockMvc` показал её как необработанное исключение: для API понадобится обработчик ошибок (`@ControllerAdvice`) и описанный в контракте 400.
- Внутри использует Jackson 2 (`com.fasterxml`), параллельно с Jackson 3 Spring Boot 4; Boot управляет Jackson 2 отдельным BOM (`jackson-2-bom` 2.21.5), конфликтов не возникло [опыт, S18].
- В документации поддерживаемые типы тела: `application/json`, `application/hal+json`; `application/problem+json` не упомянут [док, S17]. Если ошибки API будут в формате RFC 9457, проверять отдельно [?].

Здоровье проекта: последний релиз 3.0.0 от 2026-05-13, после 2026-05-15 в основную ветку нового репозитория коммитов нет [репо]; релизы бывшего `swagger-request-validator`: 2.44.9 (2025-06-12), 2.45.1 (2025-08-11), 2.46.0 (2025-09-23), 2.46.1 (2026-03-24) [реестр]. Один вендор (Atlassian). Риск средний: не заброшен, но тихо.

## 3. Мок-сервер для фронтенда

| | Prism 5.16.0 | MSW 3.0.3 (+ обработчики) |
| --- | --- | --- |
| Что это | отдельный процесс (CLI), мок по OpenAPI | перехват `fetch` в браузере (Service Worker) и в тестах (Node) |
| Последний релиз [реестр] | 2026-07-17 (5.15.11 был 2026-06-03) | 3.0.0 2026-09-28, 3.0.3 2026-10-10 |
| Требования | Node `>=24.18.0` (в `engines` пакета 5.16.0; в `main` репозитория `>=24.21.0`), у проекта 24.21.0 | Node `>=22.12.0`; пакет ESM-only, TypeScript `>=5.9`; поддерживает TS 6 и 7; Vite `>=6` [док, S13] |
| Зависимости | `npm audit` после установки: 15 уязвимостей (9 moderate, 6 high); `@scarf/scarf` с postinstall-скриптом | без замечаний при установке |
| Данные ответа | статически примеры из спецификации, иначе заглушки по схеме (`"string"`, `2019-08-24T14:15:22Z`); ключ `-d` включает случайную генерацию [док, S12] | любые: пишете руками, берёте из Orval/Hey API/`@msw/source` |
| Состояние | **нет**: ответ на `POST /bookings` не учитывает тело запроса, `page=2&pageSize=5` отвечает `page:0,pageSize:0` [опыт] | **да**: обработчики в памяти; в эксперименте второй `POST` на тот же `Slot` вернул типизированный 409 [опыт] |
| Проверка запроса | **да**: невалидное тело и `page=0` вернули 422 с описанием нарушений [опыт] | только то, что вы напишете сами (типизация `openapi-msw` ловит несоответствие на этапе компиляции) |
| Ошибочные ответы | заголовок `Prefer: code=409` (фронтенду нужно уметь его слать) [док, S12] | любой статус из обработчика |
| Повтор в тестах | отдельный процесс, нужен в CI | тот же набор обработчиков работает и в dev-сервере, и в Vitest (`setupServer`) [опыт] |
| Код в репозитории | 0 строк | обработчики, bootstrap в dev, файл `mockServiceWorker.js` в `public/` [?] |

Генерация обработчиков MSW из OpenAPI:

- **Orval** (`mock: true`): по обработчику и фабрике Faker на каждую операцию, ответ только для первого успешного статуса, данные случайные, возможны переопределения (`server.use(...)`) [док, S9]; совместимость с MSW 3.0.3 по типам проверена (`tsc` прошёл) [опыт]; peer на `msw` у Orval — `>=2`. Рантайм-поведение с MSW 3 не прогонялось [?].
- **Hey API** `msw`: по умолчанию берёт `example` из спецификации, при их отсутствии отвечает 501; статус «In Progress» [док, S11]; в документации заявлен MSW v2 (типы собираются и с 3.0.3).
- **`@msw/source`** (организация mswjs, 0.7.0 от 2026-09-28, peer `msw ^3.0.0`): берёт тело из `example`; документация упоминает OpenAPI 2.0 и 3.0 [док, S15]. До 1.0.
- **`openapi-msw`** 2.1.0 (2026-09-30; поддерживает `msw ^2.10.5 || ^3.0.0`): не генерирует, а типизирует рукописные обработчики по `paths` из `openapi-typescript` [док, S14]. Проверено вместе с MSW 3.0.3, Vitest 5.0.4, jsdom, TS 6.0.3 в строгом режиме [опыт].

Грабли MSW, которые стоит знать заранее [опыт]:

- `openapi-fetch` запоминает `globalThis.fetch` в момент `createClient`. Если клиент создан до `server.listen()`, запросы идут мимо MSW (`ECONNREFUSED`). Документация `openapi-fetch` говорит то же: «`server.listen` must be called before `createClient` is used» [док, S3]; обход: `fetch: (input) => globalThis.fetch(input)`.
- В MSW 3 переименованы опции: `onUnhandledRequest` стал `onUnhandledFrame` (TypeScript это ловит, Vitest нет) [док, S13, опыт].
- Относительный `baseUrl` под jsdom на Node-`fetch` не работает: нужен абсолютный адрес в тестах (проверено на `baseUrl: ""`). Текущий `src/lib/api.ts` использует относительные пути (`/api/hello`) [опыт].

## 4. Контрактное тестирование

| Подход | Что проверяет | Статус |
| --- | --- | --- |
| `openapi-request-validator-mockmvc` в `@WebMvcTest` | запрос и ответ каждого вызова против контракта, внутри JVM, быстро | **проверено**, основной кандидат |
| Prism в режиме `proxy` (`--errors`) | фронтенд ↔ реальный бэкенд: нарушения запроса и ответа в логе; на 501 подставляет мок | **проверено** на Spring + Prism 5.16.0 |
| Типизация клиента и обработчиков (`tsc`) | совпадение вызова и контракта на этапе компиляции | **проверено**: в `openapi-fetch` и Orval тело без обязательного поля и параметр не того типа дают ошибку `tsc`; в `openapi-fetch` неизвестный путь даёт невнятное `Expected 2 arguments` |
| Schemathesis 4.31.0 (2026-10-12) | фаззинг реального сервера по схеме, цепочки операций; запуск `uvx`/Docker, Python `>=3.11` | не запускался; добавляет Python/Docker в CI |
| Specmatic 2.55.3 (2026-10-05), ядро MIT | контракт-тесты и стабы из спецификации; большая экосистема | не оценивался [?] |
| Dredd 14.1.0 | — | репозиторий в архиве (последний пуш 2024-05-11): не рассматривать |
| Pact, Spring Cloud Contract | контракты от потребителя / собственный DSL, не OpenAPI-first | не рассматривались [?] |

Эксперимент с Prism-прокси: Spring-приложение с единственной реализованной операцией (`GET /api/event-types`); остальные методы — сгенерированные default-реализации (501). Через прокси `GET /api/event-types` пришёл от реального бэкенда, `POST /api/bookings` получил от бэкенда 501 и Prism ответил моком (`Remocking the call`), а неверный запрос в логе получил `Violation: request.body ... required property` и `Unable to match the returned status code with those defined in the document` [опыт, док S12].

## 5. Встраивание в Maven-сборку и CI

Фактические ограничения (проверено по `pom.xml`, `ci.yml`, `Dockerfile` и запускам):

- Порядок фаз Maven: `openapi-generator:generate` привязан к `generate-sources`, а `frontend-maven-plugin` (`install-node-and-npm`, `npm`) к `generate-resources` [опыт, `help:describe`]. Генератор срабатывает **раньше** фронтенд-плагина. Если OpenAPI предполагается собирать из TypeSpec через Node-часть Maven, шаг компиляции TypeSpec придётся явно привязать к более ранней фазе; либо хранить собранный `openapi.yaml` в репозитории.
- `./mvnw test` в CI-job бэкенда уже запускает `npm ci` и `npm run build` фронтенда (Node ставит сам плагин). Любой шаг генерации во фронтенд-сборке должен видеть файл контракта и в этом job, и в Docker.
- Docker: стадия `frontend-build` копирует только `frontend/`, стадия `backend-build` только `backend/`; `.dockerignore` исключает `docs`. Контракт нельзя класть в `docs/`, и в `Dockerfile` придётся добавить `COPY` каталога контракта в обе стадии, если генерация идёт при сборке.
- Для TypeScript: сгенерированные файлы попадают в `tsc -b` и `eslint .` (`--max-warnings=0`). Orval и `openapi-typescript` проходят как есть; для Hey API нужен `globalIgnores`. `npm run format` форматирует `**/*.{ts,tsx}`, поэтому закоммиченный сгенерированный код нужно добавить в `.prettierignore` [?].
- Новые зависимости на стороне фронтенда (минимум): один генератор (dev) + `msw` (dev), при `openapi-fetch` ещё один рантайм-пакет. На стороне бэкенда: плагин генератора (build) + `spring-boot-starter-validation` + валидатор (test). Отдельных рантайм-серверов в CI нет, если не брать Prism/Schemathesis.
- Коммитить ли сгенерированный код — решение для следующих тикетов: с коммитом нужен шаг «`gen` + `git diff --exit-code`» против дрейфа; без коммита нужна генерация в каждой сборке (и контракт в контексте Docker).

## Механика раздельной работы (как это складывается)

1. Контракт (`openapi.yaml`, 3.0.x) — единственный источник правды.
2. **Фронтенд** без бэкенда: сгенерированный клиент + MSW-обработчики (с состоянием там, где нужно); запросы фронтенда проверяются типами. Prism `mock` нужен только если не хочется писать обработчики вовсе (заглушки без состояния).
3. **Бэкенд** без фронтенда: сгенерированные интерфейсы + тест с валидатором на каждый эндпоинт; фронтенд как потребитель для бэкенда не нужен.
4. **Переходный период**: бэкенд реализует операции по одной; нереализованные отвечают 501 (default-методы); dev-сервер фронтенда идёт через Prism `proxy`, который на 501 подставляет мок. Нарушения контракта видны в логе Prism.
5. **Финиш**: Prism и MSW-в-браузере выключаются, остаются типы клиента, интерфейсы, тесты контракта.

## Рекомендация (коротко, с оговорками)

| Сторона | Выбор | Оговорки |
| --- | --- | --- |
| Контракт | OpenAPI **3.0.x** на выходе TypeSpec | 3.1 допустим (у `openapi-generator` beta); 3.2 нельзя: генератор не читает |
| Фронтенд-клиент | **Orval** 8.42.0 (`client: 'fetch'`) | запасной путь: `openapi-typescript` + `openapi-fetch` (тоньше и проще, но на TS 6 ставится только с обходом peer-зависимости через `overrides`, TS 7 не поддержан, релизов с февраля нет); Hey API пока нет |
| Бэкенд | **openapi-generator** 7.26.0, `spring`, `interfaceOnly`, `useSpringBoot4`, `useJackson3`, `openApiNullable=false` | схему ошибок назвать не `Error`; Checkstyle и фаза `generate-sources` настраивать явно; не подключать `springdoc` как источник истины |
| Мок-сервер | **MSW 3**: фабрики обработчиков из Orval как база, состояние и ошибочные статусы пишутся руками (фабрики Orval отдают только первый успешный статус); **Prism** по необходимости как `proxy` на период, пока бэкенд реализован не весь | MSW 3 вышел 2026-09-28: закрепить точную версию; браузерный режим не запускался; типизированные по статусам обработчики (`openapi-msw`) требуют `paths` из `openapi-typescript`, то есть второго генератора |
| Контрактные тесты | **openapi-request-validator-mockmvc** 3.0.0 в `@WebMvcTest` | один вендор и тихий репозиторий; запасной вариант — Prism `proxy` в CI, Schemathesis позже |

Что решает «в пользу» такой связки: каждая часть проверена на версиях проекта (Spring Boot 4.1.1, TypeScript 6.0.3 в строгом режиме, Vite 8.3.4, Vitest 5.0.4); ни одна не требует лишнего рантайм-сервера в CI. Связка Orval + MSW 3 проверена только на уровне компиляции, а MSW 3 в Vitest с `openapi-fetch` и `openapi-msw` проверен в работе. Поэтому первый шаг при реализации: короткий прогон обработчиков Orval под Vitest.

Напряжение между вариантами, которое стоит держать в голове: самый цельный стек «типы по контракту + типизированные моки» это `openapi-typescript` + `openapi-fetch` + `openapi-msw`, но он зависит от проекта без релизов с февраля и без поддержки TypeScript 7. Orval здоров и работает на TS 6 и 7, но типизированные по статусам моки приходится писать руками на моделях Orval.

Чего связка не гарантирует: поведение на реальной спецификации из TypeSpec (имена операций, теги, `allOf`/`oneOf`, пагинация) — всё проверялось на синтетической.

## Не подтверждено и не проверялось

- Реальный вывод TypeSpec для этого проекта: имена `operationId`, теги (определяют имена Java-интерфейсов), составные схемы, пагинация. Всё проверено на синтетической спецификации.
- Возможности OpenAPI 3.2 за пределами заголовка `3.2.0`.
- `@msw/source`: поддержка OpenAPI 3.1 документацией не названа.
- MSW 3 в браузере (Service Worker, `msw init`, плагин Vite из MSW 3) не запускался; только Node/Vitest. Рантайм-поведение обработчиков Orval/Hey API с MSW 3 не прогонялось, проверена только компиляция.
- Schemathesis, Specmatic, Pact, Spring Cloud Contract: запуск не делался (для первых двух есть только версии и даты).
- Полная сборка `docker build` не выполнялась; проверен только `dependency:go-offline` и компиляция.
- Локальный JDK был 26.0.2.1 с `--release 25`; на «чистом» JDK 25 (как в CI, Temurin) не запускалось. Документация Boot 4.1.1 заявляет совместимость с Java до 26 [док, S18].
- Поведение валидатора и генераторов для `application/problem+json`.
- Расхождение для Prism: в `engines` пакета 5.16.0 `node >=24.18.0`, в `main` репозитория `>=24.21.0` [реестр, репо]; `.nvmrc` проекта 24.21.0 подходит под оба.
- Числа в таблицах (размер бандла, число пакетов, `npm audit`) зависят от дня и от разрешения зависимостей; это замеры на 2026-10-14.
- `@typespec/http-client-js` 0.16.3 (клиент прямо из TypeSpec, минуя OpenAPI) есть в репозитории TypeSpec; не оценивался и вне вопроса тикета [?].

## Вопросы для следующих тикетов

- **Форма API.** Формат ошибки: `application/problem+json` (RFC 9457) или свой JSON (проверить на валидаторе и клиенте); не называть схему ошибки `Error`. Как в контракте выражены время и часовой пояс (`date-time` с смещением даёт `OffsetDateTime` и строку в TS; что делает TypeSpec для `plainDate`/`plainTime` и как это отображают генераторы — не проверено). Пагинация: форма (`items`, `page`, `pageSize`, `total`) генераторами принимается без проблем. Поле `id`, которое задаётся вручную, выражается `pattern`; генераторы переносят его в `@Pattern` и в Faker.
- **Расположение контракта и сборка.** Вне `docs/` (из-за `.dockerignore`); путь, доступный и `backend/`, и `frontend/` в Docker и CI; порядок фаз Maven, если OpenAPI собирается из TypeSpec; коммитить ли сгенерированный OpenAPI и сгенерированный код; исключения для Checkstyle, ESLint, Prettier.
- **Интерфейсы или только модели** на бэкенде (`interfaceOnly` против `generateApis=false`).
- **Набор моков**: нужен ли Prism вообще, или достаточно MSW; кто пишет обработчики со состоянием.
- **Версии**: закрепление точных версий MSW 3 и Orval; план на TypeScript 7 (Orval и MSW 3 готовы, `openapi-typescript` и Hey API нет).

## Приложение: как проверялось

Все эксперименты — в каталоге вне репозитория, на синтетической спецификации (`EventType`, `Slot`, `Booking`, постраничный список, ошибка 409, перечисление, `nullable`) в вариантах 3.0.3, 3.1.0 и 3.2.0. Версии: Node 24.21.0, npm 11.19.0, TypeScript 6.0.3 (а для проверки совместимости 7.0.2), Vite 8.3.4, Vitest 5.0.4, MSW 3.0.3, JDK 26.0.2.1 (`--release 25`), Spring Boot 4.1.1.

- Фронтенд: `tsc` с флагами проекта (`strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`) на выходе трёх генераторов; ESLint с копией `frontend/eslint.config.js`; сборка Vite 8.3.4 в lib-режиме; `npm install --prefix ...` с `typescript@~6`.
- Бэкенд: Maven (`backend/mvnw -f <песочница>/pom.xml`), `spring-boot-starter-parent` 4.1.1, плагин генератора 7.26.0, тест `@WebMvcTest` + `MockMvcTester` + `openApi().isValid(validator).match(result.getMvcResult())` (положительные и отрицательные случаи), отдельно Checkstyle с `backend/checkstyle.xml`, `dependency:go-offline`.
- Мок и прокси: `prism mock` (3.0, 3.1, 3.2) и `prism proxy` перед Spring-приложением на порту 8081; Vitest + `setupServer` + `openapi-msw` + `openapi-fetch`.

## Источники

Все данные по состоянию на 2026-10-14.

- [S1] openapi-typescript, введение: https://openapi-ts.dev/introduction
- [S2] openapi-fetch: https://openapi-ts.dev/openapi-fetch/
- [S3] openapi-fetch, тестирование: https://openapi-ts.dev/openapi-fetch/testing
- [S4] openapi-typescript, релизы: https://github.com/openapi-ts/openapi-typescript/releases
- [S5] issue «Add support for TypeScript 6» (#2723): https://github.com/openapi-ts/openapi-typescript/issues/2723
- [S6] issue «openapi-typescript doesn't work with Typescript 7» (#2841): https://github.com/openapi-ts/openapi-typescript/issues/2841
- [S7] npm-реестр: https://registry.npmjs.org/openapi-typescript , https://registry.npmjs.org/openapi-fetch , https://registry.npmjs.org/orval , https://registry.npmjs.org/@hey-api%2Fopenapi-ts , https://registry.npmjs.org/@stoplight%2Fprism-cli , https://registry.npmjs.org/msw , https://registry.npmjs.org/openapi-msw , https://registry.npmjs.org/@msw%2Fsource , https://registry.npmjs.org/typescript , https://registry.npmjs.org/vite
- [S8] Orval, README и релизы: https://github.com/orval-labs/orval , https://github.com/orval-labs/orval/releases
- [S9] Orval, MSW: https://orval.dev/docs/guides/msw
- [S10] Hey API, репозиторий: https://github.com/hey-api/hey-api (README пакета `packages/openapi-ts`, исходники парсеров `packages/shared/src/openApi`, плагин `packages/openapi-ts/src/plugins/msw`)
- [S11] Hey API, документация: https://heyapi.dev/docs/openapi/typescript/get-started , миграции https://heyapi.dev/openapi-ts/migrating , плагины https://heyapi.dev/docs/openapi/typescript/plugins/msw , https://heyapi.dev/docs/openapi/typescript/plugins/faker ; issue «TypeScript 7 support» https://github.com/hey-api/hey-api/issues/4235
- [S12] Prism: https://github.com/stoplightio/prism (README, `docs/guides/01-mocking.md`, `docs/guides/03-validation-proxy.md`, релизы https://github.com/stoplightio/prism/releases)
- [S13] MSW 3.0.0, заметки о релизе: https://github.com/mswjs/msw/releases/tag/v3.0.0
- [S14] openapi-msw: https://github.com/christoph-fricke/openapi-msw
- [S15] `@msw/source`: https://mswjs.io/ecosystem/source и https://mswjs.io/ecosystem/source/api/from-open-api
- [S16] OpenAPI Generator: README https://github.com/OpenAPITools/openapi-generator , опции генератора `spring` https://github.com/OpenAPITools/openapi-generator/blob/v7.26.0/docs/generators/spring.md , релизы https://github.com/OpenAPITools/openapi-generator/releases , Maven Central https://repo1.maven.org/maven2/org/openapitools/openapi-generator-maven-plugin/maven-metadata.xml
- [S17] OpenAPI Request Validator: https://github.com/atlassian/openapi-request-validator (README, `docs/OPENAPIv3.md`, `openapi-request-validator-mockmvc/README.md`), Maven Central https://repo1.maven.org/maven2/com/atlassian/oai/openapi-request-validator-core/maven-metadata.xml , объявление о переезде https://bitbucket.org/atlassian/swagger-request-validator
- [S18] Spring Boot: требования https://docs.spring.io/spring-boot/system-requirements.html , BOM 4.1.1 https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-dependencies/4.1.1/spring-boot-dependencies-4.1.1.pom
- [S19] TypeSpec: эмиттер OpenAPI 3 https://github.com/microsoft/typespec/blob/main/packages/openapi3/README.md , пакеты репозитория https://github.com/microsoft/typespec/tree/main/packages
- [S20] springdoc-openapi: https://springdoc.org/ , релизы https://github.com/springdoc/springdoc-openapi/releases
- [S21] Schemathesis: https://github.com/schemathesis/schemathesis , PyPI https://pypi.org/project/schemathesis/ ; Specmatic: https://github.com/specmatic/specmatic ; Dredd (архив): https://github.com/apiaryio/dredd
