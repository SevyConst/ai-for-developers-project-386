import { afterAll, afterEach, beforeAll } from "vitest"

import { server } from "./server"

// Запрос без обработчика роняет тест. Одного `onUnhandledFrame: "error"` мало: он лишь рвёт сам запрос,
// а страница ловит сбой и показывает «что-то пошло не так», так что тест проходил бы зелёным.
// Поэтому такие запросы запоминаются, и `afterEach` падает с их списком.
const unhandled: string[] = []

// В MSW 3 опция называется `onUnhandledFrame` (в MSW 2 была `onUnhandledRequest`).
beforeAll(() =>
  server.listen({
    async onUnhandledFrame({ frame, defaults }) {
      unhandled.push(await frame.getUnhandledMessage())
      defaults.error()
    },
  })
)
afterEach(() => {
  server.resetHandlers()

  const messages = unhandled.splice(0)
  if (messages.length > 0) {
    throw new Error(`Запросы без обработчика MSW:\n${messages.join("\n")}`)
  }
})
afterAll(() => server.close())
