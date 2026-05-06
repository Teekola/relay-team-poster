import { cacheLife, cacheTag } from "next/cache"
import { AthleteForm } from "@/components/athletes/athlete-form"
import { PageHeader } from "@/components/layout/page-header"
import { fi } from "@/messages/fi"

export default async function NewAthletePage() {
  "use cache"
  cacheTag("athletes-new-shell")
  cacheLife("max")
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        parent={{ href: "/athletes", label: fi.athletes.title }}
        current={fi.athletes.addNew}
      />
      <AthleteForm athlete={null} />
    </div>
  )
}
