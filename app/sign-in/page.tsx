"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { FormInput } from "@/components/ui/form-fields"
import { fi } from "@/messages/fi"

type Mode = "signIn" | "signUp"

const signInSchema = z.object({
  email: z.email(fi.signIn.errors.invalidEmail),
  password: z.string().min(8, fi.signIn.errors.passwordTooShort),
  name: z.string().optional(),
})

type FormValues = z.infer<typeof signInSchema>

export default function SignInPage() {
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<Mode>("signIn")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", name: "" },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null)
    setIsPending(true)
    try {
      const formData = new FormData()
      formData.set("email", values.email)
      formData.set("password", values.password)
      if (mode === "signUp") {
        formData.set("name", values.name || values.email.split("@")[0])
      }
      formData.set("flow", mode)
      await signIn("password", formData)
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("Rekisteröityminen")
          ? fi.signIn.errors.restricted
          : fi.signIn.errors.generic
      setErrorMessage(message)
    } finally {
      setIsPending(false)
    }
  })

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{fi.signIn.title}</CardTitle>
          <CardDescription>{fi.signIn.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FieldGroup>
              <FormInput
                control={form.control}
                name="email"
                label={fi.signIn.emailLabel}
                type="email"
                autoComplete="email"
              />

              {mode === "signUp" && (
                <FormInput
                  control={form.control}
                  name="name"
                  label={fi.signIn.nameLabel}
                  type="text"
                  autoComplete="name"
                />
              )}

              <FormInput
                control={form.control}
                name="password"
                label={fi.signIn.passwordLabel}
                type="password"
                autoComplete={
                  mode === "signIn" ? "current-password" : "new-password"
                }
              />
            </FieldGroup>

            {errorMessage && (
              <p className="text-destructive text-sm">{errorMessage}</p>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending
                ? fi.common.loading
                : mode === "signIn"
                  ? fi.signIn.submitSignIn
                  : fi.signIn.submitSignUp}
            </Button>

            <button
              type="button"
              className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => {
                setErrorMessage(null)
                setMode((m) => (m === "signIn" ? "signUp" : "signIn"))
              }}
            >
              {mode === "signIn"
                ? fi.signIn.toggleToSignUp
                : fi.signIn.toggleToSignIn}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
