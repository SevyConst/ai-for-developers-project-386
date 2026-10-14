import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-semibold tracking-tight text-muted-foreground">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Страница не найдена
      </h1>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        На главную
      </Link>
    </main>
  )
}
