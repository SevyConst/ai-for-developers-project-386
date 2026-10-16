import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

// `npm run dev:mock` (vite --mode mock): вместо бэкенда отвечает MSW.
// В остальных режимах Vite заменяет условие константой и вырезает ветку вместе с `virtual:msw`.
async function enableMocking() {
  if (import.meta.env.MODE === "mock") {
    const { network } = await import("virtual:msw")
    const { handlers } = await import("@/mocks/handlers.ts")

    network.configure({ handlers })
    await network.enable()
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>
  )
})
