import { render, screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"

import App from "./App"

test("renders the greeting from the backend", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input) === "/api/hello"
        ? Response.json({ message: "Greetings from Spring Boot!" })
        : new Response(null, { status: 404 })
    )
  )

  render(<App />)

  expect(await screen.findByText("Greetings from Spring Boot!")).toBeTruthy()
})
