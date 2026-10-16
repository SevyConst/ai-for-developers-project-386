import { afterAll, afterEach, beforeAll } from "vitest"

import { server } from "./server"

// В MSW 3 опция называется `onUnhandledFrame` (в MSW 2 была `onUnhandledRequest`).
// Запрос без обработчика роняет тест, а не уходит в сеть.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
