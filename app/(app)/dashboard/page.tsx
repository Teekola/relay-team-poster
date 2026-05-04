import {
  Add01Icon,
  Layout01Icon,
  RunningShoesIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { fi } from "@/messages/fi"

const SECTIONS = [
  {
    href: "/teams",
    newHref: "/teams/new",
    icon: UserGroupIcon,
    copy: fi.dashboard.sections.teams,
  },
  {
    href: "/athletes",
    newHref: "/athletes/new",
    icon: RunningShoesIcon,
    copy: fi.dashboard.sections.athletes,
  },
  {
    href: "/templates",
    newHref: "/templates/new",
    icon: Layout01Icon,
    copy: fi.dashboard.sections.templates,
  },
] as const

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-medium text-2xl">{fi.dashboard.title}</h1>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ newHref, copy }) => (
          <Link
            key={newHref}
            href={newHref}
            className={buttonVariants({ size: "default" })}
          >
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            {copy.action}
          </Link>
        ))}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon, copy }) => (
          <li key={href} className="contents">
            <Item
              variant="outline"
              render={<Link href={href} />}
              className="hover:bg-muted/60"
            >
              <ItemMedia
                variant="icon"
                className="size-10 rounded-xl bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
              >
                <HugeiconsIcon icon={icon} strokeWidth={2} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-base">{copy.title}</ItemTitle>
                <ItemDescription>{copy.description}</ItemDescription>
              </ItemContent>
            </Item>
          </li>
        ))}
      </ul>
    </div>
  )
}
