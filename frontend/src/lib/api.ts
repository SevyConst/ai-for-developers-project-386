type Greeting = { message: string }

export async function fetchGreeting(): Promise<string | null> {
  try {
    const response = await fetch("/api/hello")
    if (!response.ok) {
      return null
    }
    const greeting: Greeting = await response.json()
    return greeting.message
  } catch {
    return null
  }
}
