import { AthleteForm } from "@/components/athletes/athlete-form"
import { PageHeader } from "@/components/layout/page-header"
import { fi } from "@/messages/fi"

export default function NewAthletePage() {
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
