import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, test } from "vitest"

import App from "./App"

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

describe("главная страница", () => {
  test("рассказывает о сервисе: название и заголовок", () => {
    renderAt("/")

    expect(screen.getByRole("link", { name: "Календарь звонков" })).toBeTruthy()
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Запишитесь на звонок за минуту",
      })
    ).toBeTruthy()
  })

  test("в шапке есть кнопка «Админка», ведущая на /admin", () => {
    renderAt("/")

    const header = within(screen.getByRole("banner"))

    expect(
      header.getByRole("link", { name: "Админка" }).getAttribute("href")
    ).toBe("/admin")
  })

  test("зовёт записаться на звонок: кнопка ведёт на страницу записи", () => {
    renderAt("/")

    const cta = screen.getByRole("link", { name: "Записаться на звонок" })

    expect(cta.getAttribute("href")).toBe("/book")
  })

  test("объясняет, как это работает, тремя шагами", () => {
    renderAt("/")

    const steps = within(
      screen.getByRole("region", { name: "Как это работает" })
    )

    expect(
      steps.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    ).toEqual(["Выберите день", "Выберите слот", "Подтвердите запись"])
  })

  test("нумерует шаги: первый — выбор дня, второй — слота, третий — подтверждение", () => {
    renderAt("/")

    const steps = within(
      screen.getByRole("region", { name: "Как это работает" })
    ).getAllByRole("listitem")

    expect(
      steps.map((step) => [
        within(step).getByText(/^Шаг \d$/).textContent,
        within(step).getByRole("heading").textContent,
      ])
    ).toEqual([
      ["Шаг 1", "Выберите день"],
      ["Шаг 2", "Выберите слот"],
      ["Шаг 3", "Подтвердите запись"],
    ])
  })

  test("называет три преимущества", () => {
    renderAt("/")

    const benefits = within(
      screen.getByRole("region", { name: "Почему удобно" })
    )

    expect(
      benefits.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    ).toEqual([
      "Слоты по 30 минут",
      "Без регистрации",
      "Только свободное время",
    ])
  })

  test("указывает автора в подвале", () => {
    renderAt("/")

    expect(screen.getByRole("contentinfo").textContent).toBe(
      "Konstantin Lopatko"
    )
  })

  test("клик по кнопке открывает страницу записи", () => {
    renderAt("/")

    fireEvent.click(screen.getByRole("link", { name: "Записаться на звонок" }))

    expect(
      screen.getByRole("heading", { level: 1, name: "Запись на звонок" })
    ).toBeTruthy()
  })
})

describe("админка", () => {
  test("пока не реализована: клик по кнопке «Админка» показывает 404", () => {
    renderAt("/")

    fireEvent.click(screen.getByRole("link", { name: "Админка" }))

    expect(screen.getByText("404")).toBeTruthy()
    expect(
      screen.getByRole("heading", { level: 1, name: "Страница не найдена" })
    ).toBeTruthy()
  })
})

describe("несуществующая страница", () => {
  test("любой неизвестный адрес показывает 404 и даёт вернуться на главную", () => {
    renderAt("/no-such-page")

    expect(screen.getByText("404")).toBeTruthy()

    fireEvent.click(screen.getByRole("link", { name: "На главную" }))

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Запишитесь на звонок за минуту",
      })
    ).toBeTruthy()
  })
})

describe("страница записи", () => {
  test("пока заглушка: слоты скоро появятся, можно вернуться на главную", () => {
    renderAt("/book")

    expect(
      screen.getByText("Выбор свободного слота скоро появится здесь.")
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("link", { name: "На главную" }))

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Запишитесь на звонок за минуту",
      })
    ).toBeTruthy()
  })
})
