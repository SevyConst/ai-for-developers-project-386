import { http, HttpResponse } from "msw"

import type { EventTypePage } from "@/api/generated/model"

// Браузерный мок для `npm run dev:mock`: фейк в памяти на типах из контракта.
// Меняется контракт (`EventTypePage`) — перестаёт собираться этот файл.
const eventTypePage: EventTypePage = {
  items: [
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
  ],
  total: 2,
}

export const handlers = [
  http.get<never, never, EventTypePage>("/api/event-types", () =>
    HttpResponse.json(eventTypePage)
  ),
]
