import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button"

export function BookPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Запись на звонок
      </h1>
      <p className="text-muted-foreground">
        Выбор свободного слота скоро появится здесь.
      </p>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        На главную
      </Link>
    </main>
  )
}
