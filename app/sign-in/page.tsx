"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { fi } from "@/messages/fi"

type Mode = "signIn" | "signUp"

const signInSchema = z.object({
  email: z.email(fi.signIn.errors.generic),
  password: z.string().min(8, fi.signIn.errors.generic),
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
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {fi.signIn.emailLabel}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      autoComplete="email"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {mode === "signUp" && (
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        {fi.signIn.nameLabel}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="text"
                        autoComplete="name"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {fi.signIn.passwordLabel}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="password"
                      autoComplete={
                        mode === "signIn" ? "current-password" : "new-password"
                      }
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
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
