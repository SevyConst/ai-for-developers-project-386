import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter } from "react-router"
import { describe, expect, test } from "vitest"

import App from "@/App"
import type {
  EventType,
  EventTypeCreate,
  EventTypePage,
  FieldViolation,
  ValidationProblem,
} from "@/api/generated/model"
import { server } from "@/test/server"

function eventType(n: number, overrides: Partial<EventType> = {}): EventType {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    name: `Тип ${n}`,
    description: `Описание ${n}`,
    durationMinutes: 15,
    ...overrides,
  }
}

function respondWithPage(page: EventTypePage) {
  server.use(http.get("/api/event-types", () => HttpResponse.json(page)))
}

// Сервер с памятью: `POST` кладёт Тип в конец списка, `GET` отдаёт всё, что накопилось.
function respondWithStore(initial: EventType[]) {
  const stored = [...initial]
  const posted: EventTypeCreate[] = []

  server.use(
    http.get("/api/event-types", ({ request }) => {
      const params = new URL(request.url).searchParams
      const page = Number(params.get("page"))
      const pageSize = Number(params.get("pageSize"))

      return HttpResponse.json({
        items: stored.slice((page - 1) * pageSize, page * pageSize),
        total: stored.length,
      } satisfies EventTypePage)
    }),
    http.post("/api/event-types", async ({ request }) => {
      const body = (await request.json()) as EventTypeCreate
      const created = eventType(stored.length + 1, body)
      posted.push(body)
      stored.push(created)
      return HttpResponse.json(created, { status: 201 })
    })
  )

  return { posted, stored }
}

function eventTypes(count: number) {
  return Array.from({ length: count }, (_, i) => eventType(i + 1))
}

function fillForm(values: {
  name?: string
  description?: string
  durationMinutes?: string
}) {
  const fields: [label: string, value: string | undefined][] = [
    ["Название", values.name],
    ["Описание", values.description],
    ["Длительность, мин", values.durationMinutes],
  ]

  for (const [label, value] of fields) {
    if (value !== undefined) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    }
  }
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: "Создать" }))
}

// Пустой список и ответ `POST` с заданным статусом и телом: для сценариев отказа.
function respondToCreateWith(status: number, body: object) {
  server.use(
    http.get("/api/event-types", () =>
      HttpResponse.json({ items: [], total: 0 } satisfies EventTypePage)
    ),
    http.post("/api/event-types", () =>
      HttpResponse.json(body, {
        status,
        headers: { "Content-Type": "application/problem+json" },
      })
    )
  )
}

function validationProblem(
  errors: FieldViolation[],
  overrides: Partial<ValidationProblem> = {}
): ValidationProblem {
  return {
    status: 400,
    title: "Validation failed",
    code: "validation_failed",
    errors,
    ...overrides,
  }
}

// Текст ошибки, привязанный к полю через `aria-describedby`.
function errorOf(label: string) {
  const field = screen.getByLabelText(label)
  const id = field.getAttribute("aria-describedby")

  return id ? document.getElementById(id)?.textContent : undefined
}

function shownNames() {
  return within(screen.getByRole("list", { name: "Типы событий" }))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent)
}

function renderAdmin() {
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <App />
    </MemoryRouter>
  )
}

describe("Админка: список Типов событий", () => {
  test("показывает название, описание и длительность в минутах каждого Типа", async () => {
    respondWithPage({
      items: [
        eventType(1, {
          name: "Знакомство",
          description: "Короткий звонок.",
          durationMinutes: 15,
        }),
        eventType(2, {
          name: "Консультация",
          description: "Подробный разбор.",
          durationMinutes: 60,
        }),
      ],
      total: 2,
    })

    renderAdmin()

    const list = await screen.findByRole("list", { name: "Типы событий" })
    const items = within(list).getAllByRole("listitem")

    expect(items.map((item) => item.textContent)).toEqual([
      "ЗнакомствоКороткий звонок.15 мин",
      "КонсультацияПодробный разбор.60 мин",
    ])
  })

  test("листается по общему числу: 25 Типов по 10 на странице — три страницы", async () => {
    respondWithStore(eventTypes(25))

    renderAdmin()

    expect(await screen.findByText("Страница 1 из 3")).toBeTruthy()
    expect(shownNames()).toEqual(
      Array.from({ length: 10 }, (_, i) => `Тип ${i + 1}`)
    )
    const back = screen.getByRole("button", { name: "Назад" })
    const forward = screen.getByRole("button", { name: "Вперёд" })
    expect((back as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(forward)

    expect(await screen.findByText("Страница 2 из 3")).toBeTruthy()
    expect(await screen.findByText("Тип 11")).toBeTruthy()
    expect(shownNames()).toEqual(
      Array.from({ length: 10 }, (_, i) => `Тип ${i + 11}`)
    )

    fireEvent.click(forward)

    expect(await screen.findByText("Страница 3 из 3")).toBeTruthy()
    expect(await screen.findByText("Тип 21")).toBeTruthy()
    expect(shownNames()).toEqual([21, 22, 23, 24, 25].map((n) => `Тип ${n}`))
    expect((forward as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(back)

    expect(await screen.findByText("Страница 2 из 3")).toBeTruthy()
    expect(await screen.findByText("Тип 11")).toBeTruthy()
  })
})

describe("Админка: создание Типа события", () => {
  test("форма отправляет название, описание и длительность; после 201 список показывает новый Тип, форма очищена", async () => {
    const { posted } = respondWithStore([eventType(1)])
    renderAdmin()
    await screen.findByText("Тип 1")

    fillForm({
      name: "Интервью",
      description: "Разговор о вакансии.",
      durationMinutes: "45",
    })
    submitForm()

    expect(await screen.findByText("Интервью")).toBeTruthy()
    expect(posted).toEqual([
      {
        name: "Интервью",
        description: "Разговор о вакансии.",
        durationMinutes: 45,
      },
    ])
    expect(shownNames()).toEqual(["Тип 1", "Интервью"])
    expect((screen.getByLabelText("Название") as HTMLInputElement).value).toBe(
      ""
    )
    expect(
      (screen.getByLabelText("Описание") as HTMLTextAreaElement).value
    ).toBe("")
    expect(
      (screen.getByLabelText("Длительность, мин") as HTMLInputElement).value
    ).toBe("")
  })

  test("новый Тип встаёт в конец списка: форма открывает последнюю страницу, где он виден", async () => {
    respondWithStore(eventTypes(10))
    renderAdmin()
    expect(await screen.findByText("Страница 1 из 1")).toBeTruthy()

    fillForm({ name: "Одиннадцатый", description: "Д.", durationMinutes: "30" })
    submitForm()

    expect(await screen.findByText("Страница 2 из 2")).toBeTruthy()
    expect(await screen.findByText("Одиннадцатый")).toBeTruthy()
    expect(shownNames()).toEqual(["Одиннадцатый"])
  })

  test("после создания последняя страница берётся из свежего total: список успел вырасти", async () => {
    const { stored } = respondWithStore(eventTypes(10))
    renderAdmin()
    expect(await screen.findByText("Тип 10")).toBeTruthy()
    expect(screen.getByText("Страница 1 из 1")).toBeTruthy()

    // Пока форма открыта, Типы добавились другим путём: страница о них не знает.
    for (let n = 11; n <= 20; n++) stored.push(eventType(n))
    fillForm({ name: "Новый", description: "Д.", durationMinutes: "30" })
    submitForm()

    expect(await screen.findByText("Страница 3 из 3")).toBeTruthy()
    expect(await screen.findByText("Новый")).toBeTruthy()
    expect(shownNames()).toEqual(["Новый"])
  })

  test("кнопка заблокирована на время запроса: повторный клик не создаёт дубль", async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let posts = 0
    server.use(
      http.get("/api/event-types", () =>
        HttpResponse.json({ items: [], total: 0 } satisfies EventTypePage)
      ),
      http.post("/api/event-types", async ({ request }) => {
        posts += 1
        await gate
        const body = (await request.json()) as EventTypeCreate
        return HttpResponse.json(eventType(1, body), { status: 201 })
      })
    )
    renderAdmin()
    await screen.findByRole("list", { name: "Типы событий" })
    const button = screen.getByRole("button", {
      name: "Создать",
    }) as HTMLButtonElement

    fillForm({ name: "Н", description: "О", durationMinutes: "45" })
    submitForm()
    await waitFor(() => expect(button.disabled).toBe(true))
    fireEvent.click(button)
    release()

    await waitFor(() => expect(button.disabled).toBe(false))
    expect(posts).toBe(1)
  })
})

describe("Админка: ошибки создания", () => {
  const filled = { name: "Н", description: "О", durationMinutes: "45" }

  test.each([
    ["Название", "name", "required", "Укажите название"],
    ["Название", "name", "invalid_format", "Некорректное название"],
    ["Название", "name", "blank", "Название не может быть пустым"],
    ["Название", "name", "too_long", "Название длиннее 100 символов"],
    ["Описание", "description", "required", "Укажите описание"],
    ["Описание", "description", "invalid_format", "Некорректное описание"],
    ["Описание", "description", "blank", "Описание не может быть пустым"],
    ["Описание", "description", "too_long", "Описание длиннее 500 символов"],
    [
      "Длительность, мин",
      "durationMinutes",
      "required",
      "Укажите длительность",
    ],
    [
      "Длительность, мин",
      "durationMinutes",
      "invalid_format",
      "Длительность — целое число минут",
    ],
    [
      "Длительность, мин",
      "durationMinutes",
      "out_of_range",
      "Длительность — от 15 до 480 минут",
    ],
    [
      "Длительность, мин",
      "durationMinutes",
      "not_on_grid",
      "Длительность должна быть кратна 15 минутам",
    ],
  ] as const)(
    "400: у поля «%s» нарушение %s/%s показано по коду: «%s»",
    async (label, field, code, message) => {
      respondToCreateWith(400, validationProblem([{ field, code }]))
      renderAdmin()
      await screen.findByRole("list", { name: "Типы событий" })

      fillForm(filled)
      submitForm()

      expect(await screen.findByText(message)).toBeTruthy()
      expect(errorOf(label)).toBe(message)
      expect(screen.getByLabelText(label).getAttribute("aria-invalid")).toBe(
        "true"
      )
    }
  )

  test("400: несколько нарушений показываются сразу у своих полей; title и detail не показываются", async () => {
    respondToCreateWith(
      400,
      validationProblem(
        [
          { field: "name", code: "blank" },
          { field: "durationMinutes", code: "not_on_grid" },
        ],
        { title: "Validation failed", detail: "name: blank; durationMinutes" }
      )
    )
    renderAdmin()
    await screen.findByRole("list", { name: "Типы событий" })

    fillForm(filled)
    submitForm()

    await screen.findByText("Название не может быть пустым")
    expect(errorOf("Название")).toBe("Название не может быть пустым")
    expect(errorOf("Описание")).toBeUndefined()
    expect(errorOf("Длительность, мин")).toBe(
      "Длительность должна быть кратна 15 минутам"
    )
    expect(
      screen.getByLabelText("Описание").getAttribute("aria-invalid")
    ).not.toBe("true")
    expect(screen.queryByText(/Validation failed/)).toBeNull()
    expect(screen.queryByText(/name: blank/)).toBeNull()
  })

  test("409: «название занято» показано ошибкой у поля «Название»; title и detail не показываются", async () => {
    respondToCreateWith(409, {
      status: 409,
      title: "Event type name already taken",
      detail: "name 'Интервью' is taken",
      code: "event_type_name_taken",
    })
    renderAdmin()
    await screen.findByRole("list", { name: "Типы событий" })

    fillForm({ ...filled, name: "Интервью" })
    submitForm()

    expect(
      await screen.findByText("Тип события с таким названием уже есть")
    ).toBeTruthy()
    expect(errorOf("Название")).toBe("Тип события с таким названием уже есть")
    expect(screen.getByLabelText("Название").getAttribute("aria-invalid")).toBe(
      "true"
    )
    expect(errorOf("Описание")).toBeUndefined()
    expect(errorOf("Длительность, мин")).toBeUndefined()
    expect(screen.queryByText(/already taken/)).toBeNull()
    expect(screen.queryByText(/is taken/)).toBeNull()
  })

  test.each([
    [
      "статус 500 с не-JSON телом",
      () => HttpResponse.text("Oops", { status: 500 }),
    ],
    [
      "статус, не описанный для создания",
      () => HttpResponse.json({}, { status: 404 }),
    ],
    ["обрыв сети", () => HttpResponse.error()],
    [
      "400 без нарушений полей формы",
      () =>
        HttpResponse.json(validationProblem([]), {
          status: 400,
        }),
    ],
    [
      "400 с нарушением чужого поля",
      () =>
        HttpResponse.json(
          validationProblem([{ field: "page", code: "out_of_range" }]),
          { status: 400 }
        ),
    ],
  ])(
    "что-то пошло не так: %s — общее сообщение, введённое не теряется",
    async (_case, resolver) => {
      server.use(
        http.get("/api/event-types", () =>
          HttpResponse.json({ items: [], total: 0 } satisfies EventTypePage)
        ),
        http.post("/api/event-types", resolver)
      )
      renderAdmin()
      await screen.findByRole("list", { name: "Типы событий" })

      fillForm(filled)
      submitForm()

      expect(await screen.findByText("Что-то пошло не так")).toBeTruthy()
      expect(errorOf("Название")).toBeUndefined()
      expect(
        (screen.getByLabelText("Название") as HTMLInputElement).value
      ).toBe("Н")
      expect(
        (screen.getByRole("button", { name: "Создать" }) as HTMLButtonElement)
          .disabled
      ).toBe(false)
    }
  )
})

describe("Админка: отказ списка", () => {
  test("отказ при смене страницы: вместо карточек прежней страницы — «Что-то пошло не так»", async () => {
    respondWithStore(eventTypes(25))
    renderAdmin()
    expect(await screen.findByText("Тип 1")).toBeTruthy()

    server.use(
      http.get("/api/event-types", () =>
        HttpResponse.text("Oops", { status: 500 })
      )
    )
    fireEvent.click(screen.getByRole("button", { name: "Вперёд" }))

    expect(await screen.findByText("Что-то пошло не так")).toBeTruthy()
    expect(screen.queryByText("Тип 1")).toBeNull()
  })

  test("что-то пошло не так вместо списка; «Повторить» перечитывает его", async () => {
    server.use(
      http.get("/api/event-types", () =>
        HttpResponse.text("Oops", { status: 500 })
      )
    )
    renderAdmin()

    expect(await screen.findByText("Что-то пошло не так")).toBeTruthy()

    respondWithPage({ items: [eventType(1)], total: 1 })
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }))

    expect(await screen.findByText("Тип 1")).toBeTruthy()
    expect(screen.queryByText("Что-то пошло не так")).toBeNull()
  })

  test("пустой список: сообщение, что Типов пока нет", async () => {
    respondWithPage({ items: [], total: 0 })
    renderAdmin()

    expect(await screen.findByText("Типов событий пока нет")).toBeTruthy()
  })
})
