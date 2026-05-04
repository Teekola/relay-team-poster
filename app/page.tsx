import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { fi } from "@/messages/fi"

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="container mx-auto flex h-14 items-center px-3 sm:px-6">
        <span className="font-medium">{fi.app.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <ModeToggle />
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/sign-in">{fi.landing.secondaryCta}</Link>}
          />
        </div>
      </header>
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-3 pb-14 text-center sm:px-6">
        <h1 className="max-w-3xl text-balance font-semibold text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {fi.landing.headline}
        </h1>
        <p className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          {fi.landing.subhead}
        </p>
        <div className="mt-10">
          <Button
            size="lg"
            nativeButton={false}
            className="h-12 px-8 text-base sm:h-14 sm:px-10 sm:text-lg"
            render={<Link href="/dashboard">{fi.landing.primaryCta}</Link>}
          />
        </div>
      </main>
    </div>
  )
}
