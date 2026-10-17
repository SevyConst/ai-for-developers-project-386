import { CalendarClock } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"

import { listEventTypes } from "@/api/generated/event-types/event-types"
import type { EventType } from "@/api/generated/model"
import { EventTypeForm } from "@/components/event-type-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SOMETHING_WENT_WRONG } from "@/lib/event-type-messages"

const PAGE_SIZE = 10

function pageCountOf(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

export function AdminPage() {
  const [page, setPage] = useState(1)
  // Карточки показываются, только пока они от текущей страницы: при смене страницы и после отказа
  // под новым номером не должны висеть карточки прежней.
  const [shown, setShown] = useState<{
    page: number
    items: EventType[]
  } | null>(null)
  // null — список ещё не загружался: без этого до первого ответа мигало бы «Типов событий пока нет».
  const [total, setTotal] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [loadFailed, setLoadFailed] = useState(false)
  // После создания открываем последнюю страницу, но номер берём из свежего `total` ответа, а не из
  // того, что страница знала раньше: список мог вырасти, пока форма была открыта.
  const followEnd = useRef(false)
  const items = shown?.page === page ? shown.items : []
  const loading = !loadFailed && shown?.page !== page
  const pageCount = pageCountOf(total ?? 0)

  // Новый Тип встаёт в конец списка (порядок по времени создания).
  function showNewEventType() {
    followEnd.current = true
    setRefresh((count) => count + 1)
  }

  useEffect(() => {
    let ignore = false

    listEventTypes({ page, pageSize: PAGE_SIZE })
      .then((response) => {
        if (ignore) return
        if (response.status === 200) {
          const lastPage = pageCountOf(response.data.total)

          setShown({ page, items: response.data.items })
          setTotal(response.data.total)
          setLoadFailed(false)
          if (followEnd.current && page !== lastPage) setPage(lastPage)
          followEnd.current = false
        } else {
          setLoadFailed(true)
        }
      })
      .catch(() => {
        if (!ignore) setLoadFailed(true)
      })

    return () => {
      ignore = true
    }
  }, [page, refresh])

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <CalendarClock className="size-5 text-primary" />
            Календарь звонков
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Админка</h1>
        <div className="mt-8 grid items-start gap-8 md:grid-cols-[1fr_20rem]">
          <section aria-labelledby="event-types-title">
            <h2
              id="event-types-title"
              className="text-xl font-semibold tracking-tight"
            >
              Типы событий
            </h2>
            {loadFailed && (
              <div role="alert" className="mt-4 flex items-center gap-3">
                <p className="text-destructive">{SOMETHING_WENT_WRONG}</p>
                <Button
                  variant="outline"
                  onClick={() => setRefresh((count) => count + 1)}
                >
                  Повторить
                </Button>
              </div>
            )}
            {total === 0 && !loadFailed && (
              <p className="mt-4 text-muted-foreground">
                Типов событий пока нет
              </p>
            )}
            <ul
              aria-labelledby="event-types-title"
              aria-busy={loading}
              className="mt-4 grid gap-3"
            >
              {items.map((item) => (
                <li key={item.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="text-sm font-medium">
                        {item.durationMinutes} мин
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
            {total !== null && (
              <nav
                aria-label="Страницы"
                className="mt-4 flex items-center gap-3"
              >
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Назад
                </Button>
                <span className="text-sm text-muted-foreground">
                  Страница {page} из {pageCount}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  Вперёд
                </Button>
              </nav>
            )}
          </section>
          <section aria-labelledby="new-event-type-title">
            <h2
              id="new-event-type-title"
              className="text-xl font-semibold tracking-tight"
            >
              Новый тип события
            </h2>
            <Card className="mt-4">
              <CardContent>
                <EventTypeForm onCreated={showNewEventType} />
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
