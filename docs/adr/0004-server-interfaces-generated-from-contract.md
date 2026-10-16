---
status: accepted
---

# Серверные интерфейсы Spring генерируются из контракта, время в DTO — строка

Бэкенд не пишет сигнатуры эндпоинтов вручную: `openapi-generator-maven-plugin` 7.26.0 генерирует из `contract/openapi.yaml` Java-интерфейсы по тегам (`EventTypesApi`, `BookingsApi`) и модели; контроллеры делают `implements`. Результат лежит в `target/generated-sources` и не коммитится (как и весь код потребителей, см. ADR-0003). Генератор `spring` с опциями `interfaceOnly`, `skipDefaultInterface=true`, `useTags`, `useSpringBoot4`, `useJackson3`, `openApiNullable=false`; на вход идёт `../contract/openapi.yaml`, фаза `generate-sources`. Сгенерированные модели используются только как DTO на границе API, доменные классы пишутся отдельно. Поля `MoscowDateTime` в DTO — `String` (`typeMapping OffsetDateTime=String`): генератор вешает `@Pattern` на `OffsetDateTime`, а Hibernate Validator не умеет проверять `@Pattern` на этом типе, поэтому любой `POST` с таким телом падает с 500 (`HV000030`).

## Considered Options

- Только модели (`generateApis=false`), контроллеры вручную: интерфейс не диктует сигнатуры, но соответствие контракту держится только на тестах, а переименованная или пропущенная операция не ломает компиляцию.
- OpenAPI из кода (`springdoc`): источником истины становится код, а не контракт, что противоречит подходу Design First.
- Методы интерфейса с реализацией по умолчанию (ответ 501), чтобы недоделанный бэкенд можно было закрыть мок-прокси Prism: пропущенная операция превращается в тихий 501 вместо ошибки компиляции. Prism в проекте не используется.
- Настоящий `OffsetDateTime` в DTO со своим `ConstraintValidator<Pattern, OffsetDateTime>` через `META-INF/validation.xml` и `spring.jackson.datatype.datetime.adjust-dates-to-context-time-zone=false` (иначе Jackson 3 приводит входящее `+03:00` к UTC): типы честные, но решение держится на двух неочевидных настройках, которые легко сломать при обновлении Spring.

## Consequences

- Операция, пропущенная в контроллере, не компилируется. Интерфейсы по тегам позволяют внедрять срезы по одному тегу.
- В сигнатурах интерфейсов нет ошибок (методы возвращают `ResponseEntity<успешная модель>`): 400, 404 и 409 идут через исключения и `@RestControllerAdvice`. Обработчик возвращает только сгенерированные модели ошибок, а не Spring `ProblemDetail`: валидатор контракта отвергает незаявленные поля (`type`, `instance`). Для необязательных полей нужен `spring.jackson.default-property-inclusion=non_null`, иначе уйдёт `"detail": null`.
- Исключения, которые нужно обработать: `MethodArgumentNotValidException` (ограничения тела), `HttpMessageNotReadableException` (битый JSON, неверный тип поля), `ConstraintViolationException` (`page`, `pageSize`: путь вида `listEventTypes.page`, потому что на сгенерированном интерфейсе стоит `@Validated`), `MethodArgumentTypeMismatchException` (не-UUID в пути, `page=abc`).
- Маппер строки времени в `OffsetDateTime` и обратно (с явным `+03:00`) — отдельная задача бэкенда: строка, подходящая под шаблон, но не являющаяся датой, должна дать 400 `invalid_format` на поле.
- Кратность 15 минут (`multipleOf`) генератор Java теряет, остаются только `@Min` и `@Max`; код `not_on_grid` проверяется вручную.
- Отдельный вызов `./mvnw checkstyle:check` (как в CI) сгенерированный код не проверяет. Если когда-нибудь привязать Checkstyle к фазе после `generate-sources`, для каталога генерации нужно исключение (звёздные импорты, неиспользуемые импорты). Компилятор выдаёт предупреждения об устаревшем `org.springframework.lang.Nullable` только из сгенерированного кода.
- Версия плагина закрепляется точно: генератор выходит примерно раз в шесть недель, а у 3.1 статус beta, 3.2 он не читает вовсе, поэтому контракт остаётся в OpenAPI 3.0.0.
