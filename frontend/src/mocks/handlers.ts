import { http, HttpResponse } from "msw"

import type {
  EventType,
  EventTypeCreate,
  EventTypePage,
} from "@/api/generated/model"

// Браузерный мок для `npm run dev:mock`: фейк в памяти на типах из контракта.
// Меняется контракт — перестаёт собираться этот файл. Правил бэкенда (уникальность названия,
// кратность длительности, проверка полей) фейк не воспроизводит: это дело бэкенда и его тестов.
const initialEventTypes: EventType[] = [
  {
    id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    name: "Знакомство",
    description: "Короткий звонок, чтобы познакомиться и обсудить задачу.",
    durationMinutes: 15,
  },
  {
    id: "3b241101-e2bb-4255-8caf-4136c566a962",
    name: "Консультация",
    description: "Подробный разбор вопроса с Владельцем.",
    durationMinutes: 60,
  },
]

// Свежее состояние на каждый вызов: тесты берут чистый фейк, браузер живёт с одним (`handlers`).
export function createHandlers() {
  const eventTypes = [...initialEventTypes]

  return [
    http.get<never, never, EventTypePage>("/api/event-types", ({ request }) => {
      const params = new URL(request.url).searchParams
      const page = Number(params.get("page") ?? 1)
      const pageSize = Number(params.get("pageSize") ?? 20)

      return HttpResponse.json({
        items: eventTypes.slice((page - 1) * pageSize, page * pageSize),
        total: eventTypes.length,
      })
    }),
    http.post<never, EventTypeCreate, EventType>(
      "/api/event-types",
      async ({ request }) => {
        const created: EventType = {
          id: crypto.randomUUID(),
          ...(await request.json()),
        }
        eventTypes.push(created)

        return HttpResponse.json(created, { status: 201 })
      }
    ),
  ]
}

export const handlers = createHandlers()
