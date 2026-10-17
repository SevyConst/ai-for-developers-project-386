import { useState, type FormEvent } from "react"

import { createEventType } from "@/api/generated/event-types/event-types"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  NAME_TAKEN_MESSAGE,
  SOMETHING_WENT_WRONG,
  violationsToFieldErrors,
  type FieldErrors,
} from "@/lib/event-type-messages"

export function EventTypeForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrors({})
    setFailed(false)

    try {
      const response = await createEventType({
        name,
        description,
        // Пустое поле уходит как 0: сервер ответит `out_of_range`, и у поля покажется допустимый диапазон.
        durationMinutes: Number(durationMinutes),
      })

      if (response.status === 201) {
        setName("")
        setDescription("")
        setDurationMinutes("")
        onCreated()
      } else if (response.status === 409) {
        setErrors({ name: NAME_TAKEN_MESSAGE })
      } else if (response.status === 400) {
        const fieldErrors = violationsToFieldErrors(response.data.errors)
        setErrors(fieldErrors)
        setFailed(Object.keys(fieldErrors).length === 0)
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="event-type-name">Название</FieldLabel>
          <Input
            id="event-type-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "event-type-name-error" : undefined}
          />
          <FieldError id="event-type-name-error">{errors.name}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="event-type-description">Описание</FieldLabel>
          <Textarea
            id="event-type-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "event-type-description-error" : undefined
            }
          />
          <FieldError id="event-type-description-error">
            {errors.description}
          </FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.durationMinutes)}>
          <FieldLabel htmlFor="event-type-duration">
            Длительность, мин
          </FieldLabel>
          <Input
            id="event-type-duration"
            type="number"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            aria-invalid={Boolean(errors.durationMinutes)}
            aria-describedby={
              errors.durationMinutes ? "event-type-duration-error" : undefined
            }
          />
          <FieldError id="event-type-duration-error">
            {errors.durationMinutes}
          </FieldError>
        </Field>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {SOMETHING_WENT_WRONG}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          Создать
        </Button>
      </FieldGroup>
    </form>
  )
}
