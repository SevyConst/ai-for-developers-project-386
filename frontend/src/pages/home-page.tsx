import {
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  CircleCheck,
  Clock,
  Timer,
  UserX,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Item = { icon: LucideIcon; title: string; description: string }

const STEPS: Item[] = [
  {
    icon: CalendarDays,
    title: "Выберите день",
    description: "Откройте календарь и найдите подходящую дату.",
  },
  {
    icon: Clock,
    title: "Выберите слот",
    description: "Свободные слоты по 30 минут — занятое время скрыто.",
  },
  {
    icon: CircleCheck,
    title: "Подтвердите запись",
    description: "Звонок появится в списке предстоящих у владельца.",
  },
]

const BENEFITS: Item[] = [
  {
    icon: Timer,
    title: "Слоты по 30 минут",
    description: "Короткие звонки с понятным началом и концом.",
  },
  {
    icon: UserX,
    title: "Без регистрации",
    description: "Никаких аккаунтов и паролей — выберите время и запишитесь.",
  },
  {
    icon: CalendarCheck,
    title: "Только свободное время",
    description: "Вы видите лишь свободные слоты, занятые не показываются.",
  },
]

function ItemCard({
  icon: Icon,
  title,
  description,
  label,
}: Item & { label?: string }) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          {label && (
            <span className="text-sm font-medium text-muted-foreground">
              {label}
            </span>
          )}
        </div>
        <h3 className="text-base font-medium">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function CardSection({
  id,
  title,
  ordered = false,
  items,
}: {
  id: string
  title: string
  ordered?: boolean
  items: Item[]
}) {
  const List = ordered ? "ol" : "ul"

  return (
    <section aria-labelledby={id} className="py-12">
      <h2 id={id} className="text-center text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <List className="mt-8 grid gap-4 sm:grid-cols-3">
        {items.map((item, index) => (
          <li key={item.title}>
            <ItemCard
              {...item}
              label={ordered ? `Шаг ${index + 1}` : undefined}
            />
          </li>
        ))}
      </List>
    </section>
  )
}

export function HomePage() {
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <div className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Запишитесь на звонок за минуту
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Выберите свободное время в календаре владельца и подтвердите запись.
            Без регистрации и сложных настроек.
          </p>
          <Link
            to="/book"
            className={buttonVariants({
              size: "lg",
              className: "h-11 px-6 text-base",
            })}
          >
            Записаться на звонок
          </Link>
        </div>
        <CardSection
          id="how-it-works"
          title="Как это работает"
          ordered
          items={STEPS}
        />
        <CardSection id="benefits" title="Почему удобно" items={BENEFITS} />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Konstantin Lopatko
      </footer>
    </div>
  )
}
