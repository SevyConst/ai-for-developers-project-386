import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { listEventTypes } from "@/api/generated/event-types/event-types"
import type { EventTypePage, ValidationProblem } from "@/api/generated/model"
import { handlers } from "@/mocks/handlers"
import { server } from "@/test/server"

describe("сгенерированный клиент: listEventTypes", () => {
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
})
