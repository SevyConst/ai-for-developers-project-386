import { setupServer } from "msw/node"

// Без обработчиков по умолчанию: сценарии подключает сам тест через `server.use(...)`.
export const server = setupServer()
