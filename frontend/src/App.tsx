import { useEffect, useState } from "react"

import { fetchGreeting } from "@/lib/api"

function App() {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchGreeting().then((greeting) => {
      if (!ignore) {
        setText(greeting)
      }
    })
    return () => {
      ignore = true
    }
  }, [])

  return text === null ? null : <p>{text}</p>
}

export default App
