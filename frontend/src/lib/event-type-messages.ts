import type { FieldViolation, FieldViolationCode } from "@/api/generated/model"

export type EventTypeField = "name" | "description" | "durationMinutes"

export type FieldErrors = Partial<Record<EventTypeField, string>>

// Тексты выбираются по `code` нарушения; `title` и `detail` из ответа пользователю не показываются.
// Таблица полная по `FieldViolationCode`: новый код в контракте не даст собрать проект, пока не добавлен текст.
const VIOLATION_MESSAGES: Record<
  EventTypeField,
  Record<FieldViolationCode, string>
> = {
  name: {
    required: "Укажите название",
    invalid_format: "Некорректное название",
    blank: "Название не может быть пустым",
    too_long: "Название длиннее 100 символов",
    out_of_range: "Некорректное название",
    not_on_grid: "Некорректное название",
  },
  description: {
    required: "Укажите описание",
    invalid_format: "Некорректное описание",
    blank: "Описание не может быть пустым",
    too_long: "Описание длиннее 500 символов",
    out_of_range: "Некорректное описание",
    not_on_grid: "Некорректное описание",
  },
  durationMinutes: {
    required: "Укажите длительность",
    invalid_format: "Длительность — целое число минут",
    blank: "Некорректная длительность",
    too_long: "Некорректная длительность",
    out_of_range: "Длительность — от 15 до 480 минут",
    not_on_grid: "Длительность должна быть кратна 15 минутам",
  },
}

// Любой неописанный в контракте исход: другой статус, 5xx, обрыв сети.
export const SOMETHING_WENT_WRONG = "Что-то пошло не так"

export const NAME_TAKEN_MESSAGE = "Тип события с таким названием уже есть"

function isEventTypeField(field: string): field is EventTypeField {
  return Object.hasOwn(VIOLATION_MESSAGES, field)
}

// Нарушения полей формы -> тексты у полей. На поле приходится одно нарушение; чужие поля пропускаются.
export function violationsToFieldErrors(
  violations: FieldViolation[]
): FieldErrors {
  const errors: FieldErrors = {}

  for (const { field, code } of violations) {
    if (isEventTypeField(field)) {
      errors[field] ??= VIOLATION_MESSAGES[field][code]
    }
  }

  return errors
}
