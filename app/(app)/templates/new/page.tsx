import { PageHeader } from "@/components/layout/page-header"
import { TemplateForm } from "@/components/templates/template-form"
import { fi } from "@/messages/fi"

export default function NewTemplatePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        parent={{ href: "/templates", label: fi.templates.title }}
        current={fi.templates.addNew}
      />
      <TemplateForm template={null} />
    </div>
  )
}
