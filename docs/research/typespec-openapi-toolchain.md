# Инструментарий TypeSpec → OpenAPI в монорепозитории

Исследование для тикета [#12](https://github.com/SevyConst/ai-for-developers-project-386/issues/12) (карта [#10](https://github.com/SevyConst/ai-for-developers-project-386/issues/10)). Дата: 2026-10-14. Ничего в приложении и в основной ветке не менялось: это только заметка.

## Как читать заметку

Каждый факт помечен источником. Метки:

- **[док]** официальная документация TypeSpec (typespec.io; исходник страниц читался из репозитория `microsoft/typespec` на теге `typespec-stable@1.17.0`);
- **[npm]** вывод `npm view` от 2026-10-14 (версии проверялись по реестру, не по памяти);
- **[gh]** релизы, исходники и README на GitHub (`microsoft/typespec`, `stoplightio/spectral`, `eirslett/frontend-maven-plugin`);
- **[спец]** первичные внешние документы: спецификация OpenAPI и реестр форматов (OpenAPI Initiative), RFC 3339 и RFC 9457, справочник Spring Framework;
- **[запуск]** поведение проверено запуском `tsp` 1.17.0 на Node 24.21.0 (macOS arm64) в одноразовом проекте вне репозитория;
- **[не подтверждено]** выяснить не удалось, это предположение.

Номера `[S#]` ведут в раздел «Источники» в конце.

Для Java-разработчика (соответствия, чтобы не спотыкаться о терминологию):

| В мире Node/TypeSpec | Аналог в Java/Maven |
| --- | --- |
| `package.json` | `pom.xml` (зависимости и скрипты) |
| `package-lock.json` + `npm ci` | зафиксированные версии всего дерева зависимостей, установка строго по ним |
| `tsp compile` | запуск кодогенератора вроде `protoc` или annotation processor: из `.tsp` получаем файл |
| `tspconfig.yaml` | настройки плагина генератора |
| эмиттер (`@typespec/openapi3`) | плагин генератора, который выбирает формат результата |

## Краткие выводы

1. Стабильная линейка на 2026-10-14: `@typespec/compiler`, `@typespec/http`, `@typespec/openapi`, `@typespec/openapi3` версии **1.17.0** (опубликованы 2026-10-08); `@typespec/rest` и `@typespec/versioning` пока на **0.87.0** (0.x, политика совместимости на них не распространяется). Выходят примерно раз в месяц. [npm][S1] [док][S10]
2. Все пакеты требуют Node `>=22.0.0`, `.nvmrc` проекта (`24.21.0`) подходит; на этой версии Node всё проверено запуском. [npm][S1] [запуск]
3. Эмиттер по умолчанию выдаёт **OpenAPI 3.0.0**. Версии 3.1.0 и 3.2.0 включаются опцией `openapi-versions` (это **массив**). Для нашей модели различия между 3.0 и 3.1 минимальны. [док][S4] [запуск]
4. Результат по умолчанию: `<output-dir>/@typespec/openapi3/openapi.yaml`, где `output-dir` по умолчанию `{cwd}/tsp-output`. Это зависит от текущего каталога запуска, поэтому в `tspconfig.yaml` нужно задавать путь явно через `{project-root}`. Документация в этом месте расходится с исходниками. [док][S5] [gh][S16] [запуск]
5. Всё нужное из вопроса моделируется штатно. Исключения и подводные камни: `@pattern` нельзя повесить на скаляр от `offsetDateTime` (смещение `+03:00` проверяется только если время описано как `string` с `@format("date-time")` и `@pattern`); декораторы пагинации в OpenAPI **не оставляют следа**; префикс `/api` через `@server` попадает в `servers`, а не в `paths`. [запуск]
6. Запуск в Maven работает через уже подключённый `frontend-maven-plugin`, но шаг обязан остаться в фазе `generate-resources` после `npm ci`; флаги `-Dskip.installnodenpm -Dskip.npm` из Dockerfile пропустят и его. Для проверки «закоммиченный OpenAPI не устарел» подходит повторная генерация и `git diff --exit-code` (вывод детерминирован). [запуск][S20]
7. Линтеры: встроенный линтер TypeSpec почти пустой (одно правило в `@typespec/http/all`, `@typespec/best-practices` существует только как dev-версия), поэтому результат стоит линтить Spectral (`@stoplight/spectral-cli` 6.17.0 принял документы 3.0, 3.1 и 3.2). [док][S14] [npm][S1] [запуск]
8. Есть находка по безопасности зависимостей: чистая установка `@typespec/openapi3@1.17.0` даёт `npm audit` с 2 уязвимостями (1 высокая, 1 умеренная) в транзитивных `@scalar/json-magic` → `undici`. Проверенный обход: `overrides` в `package.json`. [запуск]

## 1. Версии пакетов и совместимость с Node

Данные `npm view` на 2026-10-14. [npm][S1]

| Пакет | Версия `latest` | Опубликована | Роль в нашей задаче |
| --- | --- | --- | --- |
| `@typespec/compiler` | 1.17.0 | 2026-10-08 | Компилятор и CLI `tsp`. Обязателен |
| `@typespec/http` | 1.17.0 | 2026-10-08 | Декораторы HTTP (`@route`, `@get`, `@statusCode`, `@header`...). Обязателен |
| `@typespec/openapi3` | 1.17.0 | 2026-10-08 | Эмиттер OpenAPI. Обязателен |
| `@typespec/openapi` | 1.17.0 | 2026-10-08 | Декораторы OpenAPI (`@info`, `@operationId`...). Обязательный peer-пакет эмиттера, нужен и сам по себе для `@info` |
| `@typespec/rest` | 0.87.0 | 2026-10-08 | Соглашения о ресурсах (`@resource`, `@autoRoute`). Для наших целей не нужен: всё из пробных спецификаций описывается через `@typespec/http` |
| `@typespec/versioning` | 0.87.0 | 2026-10-08 | Версионирование API. Не нужен: версий API у нас нет |
| `@typespec/best-practices` | только `0.46.0-dev.0` | n/a | Стабильных релизов нет |

Подробности:

- Peer-зависимости: `http` требует `compiler ^1.17.0` (и необязательный `streams ^0.87.0`); `rest` требует `http ^1.17.0` и `compiler ^1.17.0`; `openapi3` требует `http`, `openapi`, `compiler` версии `^1.17.0`, а `sse`, `xml`, `events`, `streams`, `versioning`, `json-schema` у него помечены необязательными (`peerDependenciesMeta`). [npm][S1] Установка `compiler`, `http`, `openapi`, `openapi3` через npm 11.19 подтянула 91 пакет (63 МБ в `node_modules`); платформенных пакетов и install-скриптов в `package-lock.json` нет. [запуск]
- Node: поле `engines` у `compiler`, `http`, `rest`, `openapi`, `openapi3`, `versioning` равно `node >=22.0.0`. [npm][S1] Политика проекта: поддерживаются все текущие, активные и maintenance-LTS релизы Node. [док][S10] `.nvmrc` = `24.21.0`, Maven `node.version` = `v24.21.0`, Dockerfile `node:24.21.0-alpine`. Запуск `tsp compile` проверен на Node 24.21.0 (локально и в `frontend-maven-plugin`, который скачал Node `v24.21.0`). [запуск] На `alpine` (образ из Dockerfile) не запускалось: демон Docker на машине не работал. Зависимости компилятора чисто JavaScript, нативных расширений нет (по `package-lock.json`), так что проблем не ожидается, но это **[не подтверждено]**.
- Политика совместимости: стабильными считаются пакеты версии 1.0.0 и выше; в пределах мажорной версии синтаксис и семантика не ломаются. **Пакеты 0.x (`rest`, `versioning`, `streams`, `events`, `xml`, `protobuf`...) под эту политику не подпадают.** [док][S10] Там же: вывод эмиттеров не гарантирован побайтно между версиями (семантически эквивалентные изменения не считаются ломающими), а формат stdout/stderr CLI не является контрактом. Следствие: версии нужно фиксировать (точные версии плюс закоммиченный `package-lock.json`, как советует [S11]), а обновление версий делать осознанным шагом, заново генерируя и коммитя OpenAPI.
- Темп релизов: 1.15.0 (2026-08-11), 1.16.0 (2026-09-09), 1.17.0 (2026-10-08); в `next` лежит `1.18.0-dev.x`. [npm][S1] То есть примерно раз в 4 недели.
- Менеджер пакетов: подойдёт любой, создающий `node_modules` (npm 7+, pnpm, yarn); у yarn есть оговорка про неявные peer-зависимости. [док][S12] В проекте уже используется npm.
- Альтернативная установка: автономный бинарник `tsp` (без Node) документирован как **экспериментальный**. Для проекта не рекомендуется. [док][S23]

## 2. Версия OpenAPI, `tspconfig.yaml`, имя и место результата

### Версия OpenAPI

- Опция `openapi-versions`: допустимые значения `"3.0.0" | "3.1.0" | "3.2.0"`, по умолчанию `["3.0.0"]`. [док][S4] На практике без `openapi-versions` в файле стоит `openapi: 3.0.0`. [запуск] Поддержка выдачи 3.2.0 появилась в TypeSpec 1.6.0 (2025-11-12). [gh][S22]
- Расхождение документации и поведения: в справочнике тип опции записан как одно значение, но компилятор требует **массив**. Передача `--option "@typespec/openapi3.openapi-versions=3.1.0"` в CLI даёт `invalid-schema: Schema violation: must be array (/openapi-versions)`. Работает только список в `tspconfig.yaml`: `openapi-versions: ["3.1.0"]`. [запуск]
- Если указать несколько версий, эмиттер пишет их в подкаталоги: `<emitter-output-dir>/3.0.0/openapi.yaml`, `<emitter-output-dir>/3.1.0/openapi.yaml`. Это видно только из запуска: документация этого не описывает. [запуск]
- Спецификация OpenAPI сейчас: 3.2.1 (2026-09-10), 3.2.0 (2025-09-19), 3.1.2 (2025-09-19), 3.0.4 (2024-10-24). [gh][S17] Эмиттер для «3.0» пишет `3.0.0`, а не `3.0.4`.
- Что реально отличается в выводе для нашей модели (один и тот же `.tsp`, сравнение файлов `diff`): [запуск]
  - 3.0 → 3.1: свойство, у которого есть `$ref` и описание, в 3.0 оборачивается в `allOf: [ { $ref } ]` с соседним `description`, в 3.1 это просто `$ref` с `description`; `exclusiveMinimum: true` + `minimum: 0` превращается в `exclusiveMinimum: 0`; `example: x` превращается в `examples: [x]`.
  - 3.1 → 3.2: меняется только строка `openapi:`.
- Официальных заметок о нашей стороне потребления (какие генераторы клиентов, мок-серверы и Spring-инструменты понимают 3.1/3.2) эта заметка не содержит: это вопрос тикета [#13](https://github.com/SevyConst/ai-for-developers-project-386/issues/13). Здесь установлено только то, что эмиттер умеет все три версии.

### Параметры эмиттера, которые пригодятся

Из справочника [S4] (значения по умолчанию оттуда же):

| Опция | Значение по умолчанию | Зачем |
| --- | --- | --- |
| `emitter-output-dir` | `{output-dir}/@typespec/openapi3` | Каталог результата эмиттера (абсолютный путь, допускает `{project-root}`, `{cwd}`) |
| `output-file` | `openapi.yaml` (если одна служба и одна версия; общий шаблон `{service-name-if-multiple}.{version}.openapi.yaml`) | Имя файла |
| `file-type` | `yaml` (если не задано, определяется по расширению `output-file`) | `yaml`, `json` или массив из обоих |
| `openapi-versions` | `["3.0.0"]` | Версии OpenAPI |
| `omit-unreachable-types` | `false` | Не выводить в `components` типы, не достижимые из операций |
| `operation-id-strategy` | `parent-container` | Как строить `operationId` (при `@operationId` не заданном явно) |
| `seal-object-schemas` | `false` | Запретить лишние свойства (`additionalProperties: false`) |
| `new-line` | `lf` | Переводы строк |

Что подтвердил запуск:

- Файл по умолчанию называется `openapi.yaml` и лежит в `<output-dir>/@typespec/openapi3/`. Пример: `tsp-output/@typespec/openapi3/openapi.yaml`. [запуск]
- `omit-unreachable-types: true` убирает из `components.schemas` модели, на которые нет ссылок из операций (в пробе исчезла `UnusedThing`; с `false` она осталась). Без этой опции в документ попадают все типы из пространства имён службы, и Spectral ругается правилом `oas3-unused-component` (в первой пробе на базовую модель `Problem`). Обратная сторона: модель, нужная только потребителю, но не упомянутая ни в одной операции, из документа пропадёт. [запуск]
- Операции получают `operationId` вида `<Интерфейс>_<операция>` (например, `Bookings_create`, `EventTypes_list`). [запуск] Стратегию можно менять опцией `operation-id-strategy` (объект `{ kind, separator }` допускается). [док][S4]
- `output-file` с `..` (например, `../escaped.openapi.yaml`) выходит за пределы `emitter-output-dir`, то есть файл можно положить куда угодно, но проще задать `emitter-output-dir`. [запуск]

### Где лежит результат и почему надо задать путь явно

- В исходниках компилятора по умолчанию `output-dir` равен `{cwd}/tsp-output` (`defaultConfig.outputDir` и значение `data["output-dir"] ?? "{cwd}/tsp-output"` в `config-loader.ts`). [gh][S16]
- Страница конфигурации рисует дерево с `{project-root}/tsp-output`. [док][S5] Запуск подтвердил исходники: `tsp compile <каталог проекта>`, вызванный из другого каталога, записал результат в `tsp-output/` **текущего** каталога, а не проекта. [запуск] Для Maven (где рабочий каталог зависит от `workingDirectory`) и CI это важно.
- Поэтому в `tspconfig.yaml` стоит задавать `output-dir: "{project-root}/..."` (или `emitter-output-dir`). Подстановка `{project-root}` указывает на каталог с `tspconfig.yaml`. [док][S5] [запуск]
- Файл конфигурации ищется как ближайший `tspconfig.yaml` вверх по каталогам от точки входа (`main.tsp`). [док][S5] Опциональная форма `kind: project` + `entrypoint` задаёт границу проекта и точку входа (по умолчанию `main.tsp`). [док][S5]

Стартовый вариант конфигурации (проверен компиляцией на пробной спецификации; в репозиторий не добавлялся, расположение каталога решает тикет про механику):

```yaml
emit:
  - "@typespec/openapi3"
output-dir: "{project-root}/tsp-output"   # явно, иначе берётся {cwd}/tsp-output
warn-as-error: true                       # в CI предупреждения должны ронять сборку [S5]
options:
  "@typespec/openapi3":
    output-file: "openapi.yaml"
    openapi-versions: ["3.0.0"]           # массив; значение выбирается в тикете про потребление
    omit-unreachable-types: true
linter:
  extends:
    - "@typespec/http/all"
```

Подключение пакетов в `package.json` (точные версии, как советует [S11]): `@typespec/compiler`, `@typespec/http`, `@typespec/openapi`, `@typespec/openapi3`, все `1.17.0`.

## 3. Как моделируются нужные сущности

Все примеры скомпилированы `tsp` 1.17.0 без предупреждений при `--warn-as-error`; выдержки результата приведены для OpenAPI 3.0, если не сказано иное. Идентификаторы английские, `@doc` по соглашению карты будет на русском (в примерах опущен).

### 3.1. Дата и время со смещением

Таблица соответствий эмиттера: `utcDateTime` → `type: string, format: date-time` (RFC 3339 в UTC); `offsetDateTime` → `type: string, format: date-time` (RFC 3339 со смещением); `plainDate` → `type: string, format: date`. [док][S3] Запуск подтвердил, а также то, что запрос `@query from?: offsetDateTime` и `@query date?: plainDate` дают те же форматы. [запуск] Кодирование по умолчанию в теле JSON: RFC 3339 (`rfc3339`); в заголовках RFC 7231, если не указано `@encode`. [док][S7]

Что из этого следует для «Москва, UTC+3»:

- В OpenAPI `utcDateTime` и `offsetDateTime` **неразличимы**: оба дают `string` + `format: date-time`. Формат `date-time` в реестре форматов OpenAPI определён как RFC 3339 `date-time` ([спец][S17]); в RFC 3339 (раздел 5.6) смещение обязательно (`full-time = partial-time time-offset`, то есть `Z` или `±hh:mm`), но конкретное значение смещения формат не фиксирует ([спец][S28]). [запуск]
- Зафиксировать именно `+03:00` схемой можно только через `@pattern`, но компилятор не даёт повесить `@pattern` на скаляр, производный от `offsetDateTime`: `error decorator-wrong-target: Cannot apply @pattern decorator to ... since it is not assignable to string | bytes | ModelProperty`. Это согласуется с документацией: цель `@pattern` — `string | bytes | ModelProperty`. [док][S9] [запуск]
- Рабочий вариант:

  ```tsp
  @pattern("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?\\+03:00$")
  @format("date-time")
  scalar MoscowDateTime extends string;
  ```

  Результат: `type: string`, `pattern: ...`, `format: date-time`. [запуск] Оговорка из документации: `@pattern` поддерживает «простой» синтаксис регулярных выражений (альтернативы, квантификаторы, `.`, группы), без look-around и ссылок на группы; шаблон выше компилятор принял без замечаний, но переносимость по эмиттерам не проверялась. [док][S9]
- Цена такого решения: на уровне TypeSpec поле перестаёт быть `offsetDateTime` и становится строкой (другие эмиттеры TypeSpec уже не увидят в нём момент времени со смещением), но в самом OpenAPI результат выглядит так же: `string` + `date-time`. Выбор (строка с шаблоном, просто `offsetDateTime`, или `utcDateTime`) относится к модели часового пояса (ADR из карты) и тикетам [#11](https://github.com/SevyConst/ai-for-developers-project-386/issues/11), [#17](https://github.com/SevyConst/ai-for-developers-project-386/issues/17).

### 3.2. Пагинация

- Чтобы использовать встроенную поддержку, операцию (например, список предстоящих Звонков в Админке) помечают `@list`, а свойство ответа с элементами `@pageItems`. Клиентская пагинация: `@pageSize`, `@offset`, `@pageIndex` на параметрах. Серверная: `@nextLink`, `@prevLink`, `@firstLink`, `@lastLink`, `@continuationToken`. Допускается сочетание клиентской и серверной. [док][S6]
- Пример (проверен):

  ```tsp
  @list
  @get
  op upcoming(
    @query @pageIndex page?: int32 = 1,
    @query @pageSize @minValue(1) @maxValue(100) perPage?: int32 = 20,
  ): {
    @pageItems items: Booking[];
    total: int64;
  };
  ```

  Результат: два необязательных `query`-параметра `page` (`integer/int32`, `default: 1`) и `perPage` (`minimum: 1`, `maximum: 100`, `default: 20`), ответ `200` с объектом `{ items: Booking[], total: int64 }`. [запуск]
- **Важно:** декораторы пагинации не оставляют в OpenAPI никакого следа (ни расширений `x-...`, ни тегов). Пагинация в контракте существует только как обычные query-параметры и форма тела. Значит, что такое «страница» (с единицы или нуля), максимальный размер, смысл `total`, надо зафиксировать явно: ограничениями (`@minValue`, `@maxValue`, значение по умолчанию) и `@doc`. Документация описывает сами декораторы как встроенную поддержку типовых схем пагинации и не обещает, что OpenAPI-эмиттер что-то из них выводит; использует ли их какой-то из будущих потребителей, не установлено. [док][S6] [запуск]
- Компилятор требует, чтобы в типе ответа было свойство с `@pageItems`, иначе: `error missing-paging-items: Paged operation '...' return type must have a property annotated with @pageItems`. Для шаблонной модели `Page<T>` декоратор надо поставить на свойство внутри шаблона. [запуск]
- Форма пагинации (индекс страницы, смещение, курсор), состав страницы и порядок решаются в тикете [#16](https://github.com/SevyConst/ai-for-developers-project-386/issues/16).

### 3.3. Ошибки и `application/problem+json`

- `@error` помечает модель ошибки. Если у модели нет `@statusCode`, она попадает в ответ `default` (в пробе: описание «An unexpected error response.», тело `application/json`); чтобы получить конкретный код, в модель добавляется свойство `@statusCode _: 404`. Учебник TypeSpec показывает и другой стиль: `@error`-модели (`NotFoundError`, `ValidationError`) идут в теле, а код задаётся в анонимной обёртке `{ @statusCode statusCode: 404; @body error: NotFoundError; }`. [док][S3][S13] [запуск]
- Тип содержимого ответа задаётся заголовком `contentType` в модели: [док][S8]

  ```tsp
  @error
  model Problem {
    @header contentType: "application/problem+json";
    type?: url;
    title: string;
    status: int32;
    detail?: string;
    instance?: string;
  }
  ```

  Результат: в `responses` ключ `content` равен `application/problem+json`, заголовок `contentType` в схему тела не попадает. [запуск]
- Можно сделать общий шаблон через спред, чтобы каждая ошибка добавляла свой код и литерал в теле: [запуск]

  ```tsp
  model ProblemDetails<Status extends int32> {
    @statusCode _: Status;
    @header contentType: "application/problem+json";
    type?: url = "about:blank";
    title: string;
    status: Status;
    detail?: string;
    instance?: url;
  }

  model SlotTakenProblem {
    ...ProblemDetails<409>;
    start: string;
  }
  ```

  Результат: схема `SlotTakenProblem`, `status` = `type: number` + `enum: [409]` (а не `integer`), ответ `409` с `application/problem+json`. [запуск] Сам шаблон `ProblemDetails` в `components.schemas` не появляется: поля копируются в каждую модель. [запуск]
- Члены RFC 9457: `type` (URI-ссылка), `status` (число), `title`, `detail`, `instance` (URI-ссылка); расширения допускаются, клиент обязан игнорировать неизвестные. Медиатип `application/problem+json`. [спец][S18] Spring MVC поддерживает RFC 9457 классом `ProblemDetail` и отдаёт `application/problem+json`; в Spring Boot свойство `spring.mvc.problemdetails.enabled` включает обработку встроенных исключений. [спец][S19] (Страница Spring читалась в актуальной версии; привязка к Spring Framework 7.x и Boot 4.1 не проверялась: **[не подтверждено]**.)

### 3.4. Ответ 409

Два способа, оба проверены: [запуск]

- Готовая модель без тела: `| ConflictResponse` из `@typespec/http` даёт ответ `409` с описанием «The request conflicts with the current state of the server.» и без `content`. [док][S25] [запуск]
- Своя модель с `@statusCode _: 409` и телом `application/problem+json` (см. 3.3), если Гостю нужно вернуть данные ошибки (например, какой Слот занят). Тело и код 409 для занятого Слота и пересечения Бронирований определяются в тикете [#14](https://github.com/SevyConst/ai-for-developers-project-386/issues/14).

Если у модели ошибки нет собственного `@doc`, описание ответа берётся из статус-кода (например, «The server cannot find the requested resource.» для 404); если `@doc` есть, оно попадает в `description` ответа. [запуск]

### 3.5. Ограничения

Таблица декораторов и соответствующих ключевых слов: [док][S3] (воспроизведены запуском, кроме `@minItems`/`@maxItems`)

| Декоратор | Ключевое слово OpenAPI | Результат в нашем примере |
| --- | --- | --- |
| `@minLength(1)` / `@maxLength(100)` | `minLength` / `maxLength` | `name: string` → `minLength: 1`, `maxLength: 100` |
| `@pattern("^[a-z0-9]+(-[a-z0-9]+)*$")` | `pattern` | идентификатор Типа события на скаляре `EventTypeId extends string` |
| `@minValue(5)` / `@maxValue(480)` | `minimum` / `maximum` | `durationMinutes: int32` → `minimum: 5`, `maximum: 480` |
| `@minValueExclusive(0)` | 3.0: `minimum: 0` + `exclusiveMinimum: true`; 3.1: `exclusiveMinimum: 0` | подтверждено на `float64` |
| `@minItems` / `@maxItems` | `minItems` / `maxItems` | по документации, не запускалось |
| `@format("date-time")` | `format` | на скаляре `extends string` |

Ограничения на скаляре (`scalar EventTypeId extends string`) выводятся отдельной схемой в `components.schemas`, а поля ссылаются на неё через `$ref` (в 3.0 с обёрткой `allOf`, если у поля есть своё описание). Хотите плоские схемы без отдельных скаляров, ставьте декораторы прямо на свойства модели. [запуск]

### 3.6. Что ещё всплыло при моделировании (для следующих тикетов)

- **Префикс `/api`.** `@server("/api", "...")` записывает префикс в `servers[0].url`, а в `paths` остаётся `/bookings`. Если вместо этого поставить `@route("/api")` на пространство имён, в `paths` будет `/api/bookings`. Без `@server` ключ `servers` не выводится вовсе. Выбор влияет на потребителей (клиент, Spring-генераторы, мок). [запуск]
- **Версия API в `info`.** Без `@info(#{ version: "..." })` в документе стоит `version: 0.0.0`. `@service` принимает только `title` (поле `version` в нём не допускается, компилятор ругается `invalid-argument`). `@info` лежит в пакете `@typespec/openapi`. [док][S15] [запуск]
- **Поля только для чтения.** `@visibility(Lifecycle.Read)` на поле превращается в `readOnly: true` в той же схеме `Booking`, которую используют и запрос, и ответ, а само поле остаётся в `required` (поведение 1.17.0 при `@body body: Booking`; отдельной схемы для запроса эмиттер не создал). [запуск] По спецификации OpenAPI такое сочетание допустимо: `readOnly`-свойство «SHOULD NOT be sent as part of the request», а `required` для него действует только в ответе. [спец][S27] Но кодогенераторы это учитывают не все; как поведут себя наши, неизвестно (**[не подтверждено]**, вопрос тикета #13). Альтернатива: явные модели запроса и ответа (`BookingRequest` / `Booking`), как в первой пробе. [запуск]
- **`operationId`.** Формат `Interface_op` влияет на имена методов у генераторов, которым нужен `operationId`. [запуск]
- **Идентификатор Типа события задаёт Владелец.** Это отдельный `id` в теле запроса (скаляр с `@pattern`), а не сгенерированный сервером; разметка «только чтение» для него не нужна.

## 4. CI, Maven, свежесть закоммиченного OpenAPI, линтеры

### 4.1. Запуск в CI (отдельным шагом)

Базовые команды (каждая запускалась по отдельности): [запуск]

```bash
npm ci
npx tsp compile . --warn-as-error   # код возврата 0 при успехе
npx tsp format --check "**/*.tsp"   # код возврата 1, если есть неотформатированные файлы
```

- В каталоге с `node_modules` маска `"**/*.tsp"` проверила только файл проекта (`✔ 1 formatted`), `.tsp`-файлы библиотек из `node_modules` не затронуты. [запуск]
- `--warn-as-error` в CLI и `warn-as-error: true` в `tspconfig.yaml`: все предупреждения превращаются в ошибки; документация рекомендует включать в CI. [док][S5]
- Полный перечень флагов `tsp compile` (`--output-dir`, `--option`, `--config`, `--no-emit`, `--list-files`...) выводит `tsp compile --help`. [запуск]
- Тестовых запусков самой GitHub Actions-задачи не было: текущие задачи `backend` и `frontend` в `.github/workflows/ci.yml` не менялись. Для нового шага пригодится `actions/setup-node` с `node-version-file` (в проекте уже так сделано для `frontend/.nvmrc`). **[не подтверждено]** на реальном прогоне CI.
- Прогресс `tsp` пишет в stderr; по документации stderr не считается признаком ошибки, а формат вывода CLI не является контрактом. [док][S10] В Maven это выглядит как строки `[ERROR] - Compiling...` при `BUILD SUCCESS` (косметика). [запуск]

### 4.2. Запуск в Maven-сборке

Проверено в одноразовом Maven-проекте (вне репозитория) с `frontend-maven-plugin` 2.0.2 (та же версия, что в `backend/pom.xml`; на 2026-10-14 это последний релиз в метаданных Maven Central [gh][S20]) и Node `v24.21.0`: [запуск]

```xml
<execution>
  <id>contract-npm-ci</id>
  <goals><goal>npm</goal></goals>
  <configuration><arguments>ci</arguments></configuration>
</execution>
<execution>
  <id>contract-build</id>
  <goals><goal>npm</goal></goals>
  <configuration><arguments>run build</arguments></configuration> <!-- build = "tsp compile . --warn-as-error" -->
</execution>
```

(в проекте плагин настроен на `workingDirectory` = `frontend`; для каталога контракта его нужно переопределить на уровне executions или завести отдельный блок плагина.)

Что обнаружилось:

- **Фазу не менять.** Выполнение, привязанное к `generate-sources`, упало: `Cannot run program ".../target/node/node"`, потому что установка Node (`install-node-and-npm`) по умолчанию идёт в `generate-resources`, то есть позже. Шаги `npm` по умолчанию тоже в `generate-resources`, порядок внутри фазы — порядок в `pom.xml`. [запуск]
- **Флаги `-Dskip.installnodenpm -Dskip.npm`** (как в `Dockerfile`, стадия `backend-build`) пропускают и шаги контракта: в логе «Skipping execution» для всех трёх выполнений. Значит, в Docker-сборке OpenAPI должен либо быть закоммичен, либо генерироваться на Node-стадии `Dockerfile`; Maven его там не сгенерирует. [запуск][S20]
- Сейчас задача CI `backend` запускает `./mvnw -B test`, а он через `pom.xml` уже скачивает Node, делает `npm ci` и `npm run build` фронтенда (`generate-resources`). Любое выполнение в `pom.xml` добавится в эту же задачу. (Из `pom.xml` и `ci.yml`, этот прогон не запускался.)
- Если генерацию в Maven не добавлять, остаётся вариант «OpenAPI закоммичен; Maven и фронтенд читают готовый файл; свежесть проверяет отдельная задача CI» (см. 4.3). Какой вариант выбирать, решает тикет про механику ([#18](https://github.com/SevyConst/ai-for-developers-project-386/issues/18)).

### 4.3. Проверка, что закоммиченный OpenAPI не устарел

- Вывод детерминирован: два прогона подряд дали побайтно одинаковый файл (одинаковый SHA-1), в нём нет временных меток и абсолютных путей. Сопоставлялось на одной машине; между ОС и версиями Node не сравнивалось (**[не подтверждено]**; помогут `new-line: lf` по умолчанию и `.gitattributes` с `* text=auto eol=lf`, который в репозитории уже есть). [запуск]
- Схема проверки в CI: сгенерировать файл на месте и сравнить с индексом: `git diff --exit-code -- <путь к openapi.yaml>` (для нового, ещё не закоммиченного файла `git diff` ничего не покажет, нужен ещё `git status --porcelain`). Альтернатива без git: сгенерировать во временный каталог и сравнить `diff -u`: `tsp compile . --option "@typespec/openapi3.emitter-output-dir=<tmp>"` отработал, содержимое совпало с обычным. [запуск]
- Фиксация версий обязательна: вывод эмиттера может меняться между версиями TypeSpec, и без `package-lock.json` проверка начнёт падать «сама». [док][S10][S11]

### 4.4. Линтеры

- **Встроенный линтер TypeSpec.** Включается в `tspconfig.yaml` блоком `linter.extends`. Набор правил `@typespec/http/all` принят компилятором. [док][S5][S14] [запуск] В нём единственное правило `@typespec/http/op-reference-container-route`. [док][S14] Библиотека `@typespec/best-practices` в реестре существует только как `0.46.0-dev.0`, стабильного релиза нет. [npm][S1] У `@typespec/openapi3` собственных правил линтера в установленном пакете нет. [запуск] Вывод: встроенный линтер почти ничего не проверяет, главную работу делают сам компилятор (ошибки типов, `--warn-as-error`) и `tsp format --check`.
- **Spectral** (`@stoplight/spectral-cli` 6.17.0, 2026-10-01, `engines.node` `^22.0 || >= 24.0`). [npm][S1] Набор `spectral:oas` на выводе эмиттера для 3.0, 3.1 и 3.2: 0 ошибок, 16 предупреждений (нет `info.contact`, нет `description` и `tags` у операций, неиспользуемая схема `Problem`). [запуск] Проверка, что 3.2 действительно валидируется, а не пропускается: в намеренно сломанном документе `openapi: 3.2.0` Spectral выдал ошибки `oas3-schema`. [запуск] В заметках релиза 6.17.0 есть пункт «OAS 3.2 support (fix OAS 3.2 schema validation and align with 3.0/3.1)». [gh][S21] Вместе с проверкой на сломанном документе это показывает, что 3.2 в Spectral 6.17.0 проверяется; насколько полно относительно стандарта, не оценивали (**[не подтверждено]**).
- При установке Spectral npm 11.19 предупредил, что у пакета `@scarf/scarf` есть `postinstall`-скрипт, не покрытый `allowScripts`; выполнялся ли он и что именно делает, не выясняли (**[не подтверждено]**).
- Другие линтеры (например, Redocly CLI) не исследовались.

### 4.5. Находка по безопасности зависимостей

Чистая установка `@typespec/openapi3@1.17.0` (диапазон `@scalar/json-magic ^0.13.2` → 0.13.5 → `undici 7.24.4`, плюс `@scalar/openapi-parser` с `json-magic 0.15.7` → `undici 7.29.1`) даёт `npm audit`: **2 уязвимости (1 высокая в `undici`, 1 умеренная в `@scalar/json-magic`)**, `fixAvailable: true`. [запуск] Это инструмент сборки (в jar он не попадает), но запуск `npm audit` в CI из-за него падал бы; сейчас в CI проекта `npm audit` не запускается. Проверенный обход: `"overrides": { "@scalar/json-magic": "0.15.7" }` в `package.json` даёт `found 0 vulnerabilities`, компиляция проходит, вывод идентичен (сравнивался `diff`). [запуск] В dev-версии `1.18.0-dev.2` пакета `openapi3` диапазон уже `@scalar/json-magic ^0.15.5`, то есть исправление, судя по всему, придёт в 1.18 (в стабильном релизе не проверено). [npm][S1] Достижимы ли уязвимые пути `undici` из самого эмиттера, не анализировалось: **[не подтверждено]**.

## 5. Что не удалось подтвердить

- Работа `tsp` в образе `node:24.21.0-alpine` (Docker-демон на машине был выключен). Нативных зависимостей в дереве нет, поэтому риск оценён как низкий.
- Плагин TypeSpec для IntelliJ IDEA. В официальной документации редакторов описаны только VS Code и Visual Studio ([S24], в каталоге `docs/introduction/editor/` два файла: `vscode.md`, `vs.md`). Поиск на JetBrains Marketplace через веб-страницу не дал данных (страница отдаёт только оболочку), так что наличие сторонних плагинов не установлено.
- Запуск нового шага в реальном GitHub Actions и совместимость с текущими `ci.yml`/`hexlet-check.yml` (файлы не менялись).
- Детерминизм вывода между ОС и версиями Node (проверен только повтор на одной машине).
- Поддержка OpenAPI 3.1/3.2 инструментами потребления (клиент, Spring, мок): не входит в этот тикет, см. [#13](https://github.com/SevyConst/ai-for-developers-project-386/issues/13).
- Привязка Spring-документации по `ProblemDetail` к конкретным версиям Spring Framework 7 / Boot 4.1.
- Полная картина `npm audit`-находки (достижимость уязвимого кода) и поведение `@scarf/scarf` (телеметрия) у Spectral.
- Пакеты `@typespec/rest` и `@typespec/versioning` не запускались вместе с эмиттером; их версии и peer-зависимости взяты из реестра.

## 6. Риски и вопросы для следующих тикетов

Форма API ([#17](https://github.com/SevyConst/ai-for-developers-project-386/issues/17), [#14](https://github.com/SevyConst/ai-for-developers-project-386/issues/14), [#15](https://github.com/SevyConst/ai-for-developers-project-386/issues/15), [#16](https://github.com/SevyConst/ai-for-developers-project-386/issues/16), [#11](https://github.com/SevyConst/ai-for-developers-project-386/issues/11)):

1. **Модель времени.** `offsetDateTime` и `utcDateTime` в OpenAPI одинаковы; чтобы схема требовала `+03:00`, поле придётся описывать как `string` + `@format("date-time")` + `@pattern`. Решить: нужен ли «жёсткий» шаблон в контракте или достаточно описания в `@doc` и проверки на сервере. Это решение трудно обратимо (затронет ADR о часовом поясе).
2. **Пагинация.** Декораторы `@list`/`@pageItems`/`@pageSize` не видны потребителям. Всё, что важно (нумерация с 0 или с 1, предел размера страницы, смысл и обязательность `total`), должно быть явно в параметрах, ограничениях и `@doc`.
3. **Ошибки.** Единая модель `application/problem+json`: какие коды (400/404/409), есть ли массив ошибок полей (`errors`), литеральный `status` (`enum: [409]`). 409 для занятого Слота и пересечения Бронирований нужен как отдельный именованный тип.
4. **Префикс `/api`.** Через `@route("/api")` (в `paths`) или `@server("/api")` (в `servers`). Влияет на кодогенераторы и мок.
5. **Запрос и ответ.** Общая модель с `@visibility(Lifecycle.Read)` даёт `readOnly: true` вместе с `required`, а явные `*Request`-модели чище для кодогенерации.
6. **Версия OpenAPI (3.0 или 3.1/3.2).** Для нашей модели разница мала (см. раздел 2); выбирается по поддержке у потребителей (#13). По умолчанию эмиттер даёт 3.0.0.

Механика раздельной работы ([#18](https://github.com/SevyConst/ai-for-developers-project-386/issues/18)):

1. **Коммитить ли `openapi.yaml`.** Флаги `-Dskip.installnodenpm -Dskip.npm` в `Dockerfile` пропускают любые `npm`-шаги Maven, поэтому генерация внутри Maven не сработает в Docker-сборке без правки `Dockerfile`. Простейшая схема из проверенных: контракт и `openapi.yaml` коммитятся, отдельная задача CI проверяет свежесть (раздел 4.3); фронтенд и бэкенд читают готовый файл и не зависят от `tsp`.
2. **Где лежит каталог контракта.** Отдельный каталог с собственным `package.json` и `package-lock.json` не затрагивает `npm ci` фронтенда (внутри 63 МБ зависимостей TypeSpec), но потребует копирования в стадии `Dockerfile`, если контракт нужен при сборке; `.dockerignore` сейчас исключает `.git`, `.idea`, `.claude`, `docs` и `**/*.local`. Подключение к `frontend/package.json` проще, но смешивает зависимости.
3. **Версия Node.** Сейчас она задана в трёх местах (`frontend/.nvmrc`, `node.version` в `backend/pom.xml`, `node:24.21.0-alpine` в `Dockerfile`), а CI фронтенда читает `.nvmrc`. Новый шаг сборки контракта не должен вводить четвёртый источник: в CI можно указать `node-version-file: frontend/.nvmrc`, а в Maven и Docker версия уже общая.
4. **Обновления.** Релизы TypeSpec выходят примерно раз в месяц; при обновлении нужно заново генерировать и коммитить OpenAPI, потому что вывод эмиттера между версиями не гарантирован побайтно [S10].
5. **Редактор.** Для IntelliJ IDEA официальной поддержки `.tsp` в документации нет (VS Code и Visual Studio); автору проекта потребуется либо VS Code для `.tsp`, либо работа через `tsp format` и обычный текстовый редактор.
6. **Зависимости разработки.** `npm audit` на свежей установке не чистый (раздел 4.5); если в CI появится аудит, нужен `overrides` до выхода 1.18.
7. **Экспериментальное, чего стоит избегать:** `features: declaration-expressions` (экспериментальный синтаксис 1.17), автономный бинарник `tsp`, опция `experimental-parameter-examples`, серверные эмиттеры `http-server-js` / `http-server-csharp` (версии `alpha`). Среди серверных эмиттеров в документации нет Java/Spring (в каталоге `emitters/servers/` только `http-server-csharp` и `http-server-js`). [док][S2][S4][S23][S26] [npm][S1]
8. **Расхождение терминов.** В `CONTEXT.md` на `main` термины «Админ», «Запись»; в Notes карты #10 «Владелец», «Бронирование», «Тип события», «Окно записи». К исследованию не относится, но перед написанием `.tsp` с `@doc` словарь нужно свести.

## Источники

Документация читалась из исходников страниц в репозитории на теге `typespec-stable@1.17.0` (`website/src/content/docs/docs/...`), опубликованных на typespec.io.

- [S1] npm-реестр: `npm view <пакет> version|dist-tags|engines|peerDependencies|time` для `@typespec/compiler`, `@typespec/http`, `@typespec/rest`, `@typespec/openapi`, `@typespec/openapi3`, `@typespec/versioning`, `@typespec/best-practices`, `@stoplight/spectral-cli`; `npm audit` на пробной установке. 2026-10-14.
- [S2] Релиз TypeSpec 1.17.0 (заметки): https://github.com/microsoft/typespec/releases/tag/typespec-stable%401.17.0
- [S3] Эмиттер OpenAPI v3 (соответствие конструкций): https://typespec.io/docs/emitters/openapi3/openapi/
- [S4] Эмиттер OpenAPI v3: параметры: https://typespec.io/docs/emitters/openapi3/reference/emitter/
- [S5] Конфигурация (`tspconfig.yaml`, выходной каталог, `warn-as-error`, `linter`): https://typespec.io/docs/handbook/configuration/configuration/
- [S6] Пагинация: https://typespec.io/docs/standard-library/pagination/
- [S7] Кодирование типов (`utcDateTime`, `offsetDateTime`): https://typespec.io/docs/libraries/http/encoding/
- [S8] Content-Type в `@typespec/http`: https://typespec.io/docs/libraries/http/content-types/
- [S9] Встроенные декораторы (`@pattern`, `@format`, `@error`, `@list` и др.): https://typespec.io/docs/standard-library/built-in-decorators/
- [S10] Политика ломающих изменений: https://typespec.io/docs/handbook/breaking-change-policy/
- [S11] Воспроизводимость сборки: https://typespec.io/docs/handbook/reproducibility/
- [S12] Менеджеры пакетов: https://typespec.io/docs/handbook/package-manager/
- [S13] Обработка ошибок (учебник REST): https://typespec.io/docs/getting-started/getting-started-rest/03-handling-errors/
- [S14] Линтер `@typespec/http`: https://typespec.io/docs/libraries/http/reference/linter/
- [S15] Декораторы `@typespec/openapi` (`@info`): https://typespec.io/docs/libraries/openapi/reference/decorators/
- [S16] Исходник компилятора, значения по умолчанию для `output-dir`: https://github.com/microsoft/typespec/blob/typespec-stable%401.17.0/packages/compiler/src/config/config-loader.ts (строки 24-27 и 249)
- [S17] OpenAPI Initiative: релизы спецификации https://github.com/OAI/OpenAPI-Specification/releases ; реестр форматов (`date-time`): https://spec.openapis.org/registry/format/date-time.html
- [S18] RFC 9457 (Problem Details for HTTP APIs): https://www.rfc-editor.org/rfc/rfc9457.html (разделы 3 и 3.1-3.2)
- [S19] Spring Framework, Error Responses (`ProblemDetail`): https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html
- [S20] `frontend-maven-plugin` (README, флаги пропуска, версия на Maven Central): https://github.com/eirslett/frontend-maven-plugin ; метаданные https://repo1.maven.org/maven2/com/github/eirslett/frontend-maven-plugin/maven-metadata.xml
- [S21] Релизы Spectral (6.17.0, поддержка OAS 3.2): https://github.com/stoplightio/spectral/releases
- [S22] Релиз TypeSpec 1.6.0 (поддержка выдачи OpenAPI 3.2.0, PR #8828): https://github.com/microsoft/typespec/releases/tag/typespec-stable%401.6.0
- [S23] Установка TypeSpec (автономный бинарник, экспериментальный): https://typespec.io/docs/
- [S24] Редакторы (VS Code, Visual Studio): каталог `website/src/content/docs/docs/introduction/editor/` на теге `typespec-stable@1.17.0`.
- [S25] Модели `@typespec/http` (`ConflictResponse`, `NotFoundResponse`...): https://typespec.io/docs/libraries/http/reference/data-types/
- [S26] Список серверных эмиттеров: каталог `website/src/content/docs/docs/emitters/servers/` на теге `typespec-stable@1.17.0` (по дереву `git/trees` GitHub API).
- [S27] OpenAPI 3.0.4, Schema Object (`readOnly`): https://spec.openapis.org/oas/v3.0.4.html#schema-object
- [S28] RFC 3339, раздел 5.6 (грамматика `date-time`): https://www.rfc-editor.org/rfc/rfc3339.html#section-5.6

Как воспроизвести «[запуск]»: одноразовый проект с точными версиями из раздела 1 (`npm install`), пробная спецификация на ~100 строк (`Event`-/`Booking`-подобные модели), `tsp compile` с конфигурациями `openapi-versions: ["3.0.0"|"3.1.0"|"3.2.0"]`, `Spectral` с `extends: ["spectral:oas"]`, одноразовый `pom.xml` с `frontend-maven-plugin` 2.0.2. Файлы пробы в репозиторий не добавлялись.
