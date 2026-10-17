import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import {
  createEventType,
  listEventTypes,
} from "@/api/generated/event-types/event-types"
import type { EventTypePage, ValidationProblem } from "@/api/generated/model"
import { createHandlers, handlers } from "@/mocks/handlers"
import { server } from "@/test/server"

describe("сгенерированный клиент и браузерный мок: event-types", () => {
  test("200: тело отвечает схеме EventTypePage, результат сужается по status", async () => {
    const page: EventTypePage = {
      items: [
        {
          id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          name: "Знакомство",
          description: "Короткий звонок.",
          durationMinutes: 15,
        },
      ],
      total: 1,
    }
    server.use(
      http.get("/api/event-types", () =>
        HttpResponse.json(page, { status: 200 })
      )
    )

    const response = await listEventTypes({ page: 1, pageSize: 20 })

    if (response.status !== 200) {
      expect.unreachable(`ожидали 200, пришло ${response.status}`)
    }
    // Здесь response.data — EventTypePage: без сужения по status это не собралось бы.
    expect(response.data.items.map((item) => item.name)).toEqual(["Знакомство"])
    expect(response.data.total).toBe(1)
  })

  test("400: тело отвечает схеме ValidationProblem, code и errors доступны без приведения типов", async () => {
    const problem: ValidationProblem = {
      status: 400,
      title: "Validation failed",
      code: "validation_failed",
      errors: [{ field: "pageSize", code: "out_of_range" }],
    }
    server.use(
      http.get("/api/event-types", () =>
        HttpResponse.json(problem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        })
      )
    )

    const response = await listEventTypes({ pageSize: 1000 })

    if (response.status !== 400) {
      expect.unreachable(`ожидали 400, пришло ${response.status}`)
    }
    expect(response.data.code).toBe("validation_failed")
    expect(response.data.errors).toEqual([
      { field: "pageSize", code: "out_of_range" },
    ])
  })

  test("параметры page и pageSize уходят в строку запроса", async () => {
    let query = ""
    server.use(
      http.get("/api/event-types", ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json({
          items: [],
          total: 0,
        } satisfies EventTypePage)
      })
    )

    await listEventTypes({ page: 2, pageSize: 5 })

    expect(query).toBe("?page=2&pageSize=5")
  })

  test("браузерный мок (src/mocks): обработчик отвечает клиенту фикстурой по схеме", async () => {
    server.use(...handlers)

    const response = await listEventTypes()

    if (response.status !== 200) {
      expect.unreachable(`ожидали 200, пришло ${response.status}`)
    }
    expect(response.data.total).toBe(response.data.items.length)
    expect(response.data.items.length).toBeGreaterThan(0)
  })

  test("браузерный мок: список режется по page и pageSize, страница за пределами пуста", async () => {
    server.use(...createHandlers())

    const second = await listEventTypes({ page: 2, pageSize: 1 })
    const beyond = await listEventTypes({ page: 9, pageSize: 1 })

    if (second.status !== 200 || beyond.status !== 200) {
      expect.unreachable("ожидали 200")
    }
    expect(second.data.items.map((item) => item.name)).toEqual(["Консультация"])
    expect(second.data.total).toBe(2)
    expect(beyond.data).toEqual({ items: [], total: 2 })
  })

  test("браузерный мок: createEventType отвечает 201 с Типом по схеме, новый Тип встаёт в конец списка", async () => {
    server.use(...createHandlers())

    const created = await createEventType({
      name: "Интервью",
      description: "Разговор о вакансии.",
      durationMinutes: 45,
    })

    if (created.status !== 201) {
      expect.unreachable(`ожидали 201, пришло ${created.status}`)
    }
    expect(created.data).toMatchObject({
      name: "Интервью",
      description: "Разговор о вакансии.",
      durationMinutes: 45,
    })
    expect(created.data.id).toMatch(/^[0-9a-f-]{36}$/)

    const list = await listEventTypes({ page: 1, pageSize: 100 })
    if (list.status !== 200) {
      expect.unreachable(`ожидали 200, пришло ${list.status}`)
    }
    expect(list.data.total).toBe(3)
    expect(list.data.items.at(-1)).toEqual(created.data)
  })
})
