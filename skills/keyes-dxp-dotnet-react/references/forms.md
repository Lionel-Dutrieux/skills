# Forms and validation

TanStack Form + Zod + shadcn/ui, consumed through **one typed `useAppForm` hook** built with
`createFormHook`. No raw `<form.Field>` in feature code, no Label/Input/error markup copied
from one form to the next.

Reference implementation: `PLX.EUROPE.BEL.PUBBEN_PUBLIC_WEBSITES` (`app/src/forms/`). The
shapes below are that codebase, minus Next.js. Submission goes to the ASP.NET backend
through TanStack Query + `openapi-fetch` instead of a server action.

## Layout

```
src/forms/
  form-contexts.ts        # createFormHookContexts() — leaf module, no local imports
  form-context.ts         # createFormHook() — the useAppForm the app imports
  fields/
    TextField.tsx  SelectField.tsx  CheckboxField.tsx  DateField.tsx
    TextareaField.tsx  NumberField.tsx  RadioField.tsx  SwitchField.tsx
    ComboboxField.tsx  SliderField.tsx  ChoiceCardField.tsx  PhoneNumberField.tsx
    types.ts  index.ts
  components/
    SubmitButton.tsx  index.ts
```

**The two-file split is mandatory, not stylistic.** `form-context.ts` imports the field
components, and the field components need `useFieldContext` — importing it from
`form-context.ts` creates a cycle (`form-context → fields/index → TextField →
form-context`). Contexts therefore live in their own leaf module. Field components import
from `form-contexts.ts`; only feature code imports from `form-context.ts`.

## The contexts and the hook

```ts
// src/forms/form-contexts.ts
import { createFormHookContexts } from "@tanstack/react-form"

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
```

```ts
// src/forms/form-context.ts
import { createFormHook } from "@tanstack/react-form"
import { SubmitButton } from "./components"
import { CheckboxField, DateField, SelectField, TextField /* … */ } from "./fields"
import { fieldContext, formContext } from "./form-contexts"

export { useFieldContext, useFormContext } from "./form-contexts"

export const { useAppForm } = createFormHook({
  fieldComponents: { CheckboxField, DateField, SelectField, TextField /* … */ },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
})
```

Note the import: **`@tanstack/react-form`**, not `@tanstack/react-form-nextjs` — that
package exists only for server-action integration and has no place in this stack.

Adding a field type = write the component, export it from `fields/index.ts`, register it in
`fieldComponents`. It is then available as `field.MyField` on every form, typed.

## A field component

Every field follows the same contract: it reads its own state from context, and receives
only presentation props. It never receives the form or the field name.

```tsx
// src/forms/fields/TextField.tsx
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFieldContext } from "../form-contexts"
import type { TextFieldProps } from "./types"

export function TextField({
  label, description, required, className, disabled, type = "text", placeholder,
}: Readonly<TextFieldProps>) {
  const field = useFieldContext<string>()
  const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
  const fieldId = field.name

  return (
    <Field className={cn(className)} data-disabled={disabled || undefined} data-invalid={isInvalid || undefined}>
      {label && (
        <FieldLabel htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </FieldLabel>
      )}
      <FieldContent>
        <Input
          aria-describedby={isInvalid ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined}
          aria-invalid={isInvalid || undefined}
          disabled={disabled}
          id={fieldId}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          type={type}
          value={field.state.value ?? ""}
        />
        {description && !isInvalid && (
          <FieldDescription id={`${fieldId}-description`}>{description}</FieldDescription>
        )}
        {isInvalid && (
          <FieldError id={`${fieldId}-error`} errors={field.state.meta.errors.map((e) => ({ message: e.message }))} />
        )}
      </FieldContent>
    </Field>
  )
}
```

Non-negotiable details:

- **`isTouched && errors.length`**, never `errors.length` alone — otherwise every field is
  red before the user types.
- **`id={field.name}`** + `htmlFor`, `aria-invalid`, `aria-describedby` pointing at the
  error *or* the description. Accessibility is written once here and inherited by every form.
- **`value={field.state.value ?? ""}`** — an `undefined` value makes the input uncontrolled
  and React warns on the first keystroke.
- Props live in `fields/types.ts`, all extending `BaseFieldProps`
  (`label`, `description`, `required`, `className`, `disabled`). Keep it homogeneous.
- The wrapper markup comes from shadcn/ui's `Field` family
  (`pnpm dlx shadcn@latest add field`). Do not re-invent it, and do not edit it —
  see the `components/ui/` rule in `SKILL.md`.

## Form-level components

Registered under `formComponents` and rendered inside `<form.AppForm>`:

```tsx
// src/forms/components/SubmitButton.tsx
import { Button } from "@/components/ui/button"
import { useFormContext } from "../form-contexts"

export function SubmitButton({ label = "Submit", submittingLabel = "Submitting…" }: Readonly<SubmitButtonProps>) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? submittingLabel : label}
        </Button>
      )}
    </form.Subscribe>
  )
}
```

`form.Subscribe` is how you scope re-renders — the button re-renders on `isSubmitting`,
the rest of the form does not. There is no `watch()`.

## A feature form

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { api } from "@/lib/api"          // openapi-fetch client
import { useAppForm } from "@/forms/form-context"

export function AddressForm({ address }: { address: Address }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { mutateAsync } = useMutation({
    mutationFn: async (value: AddressInput) => {
      const { data, error } = await api.PUT("/api/users/me/address", { body: value })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", "me"] }),
  })

  const form = useAppForm({
    defaultValues: {
      street: address.street ?? "",
      number: address.number ?? "",
      postalCode: address.postalCode ?? "",
      city: address.city ?? "",
    },
    onSubmit: async ({ value }) => {
      await mutateAsync(value)
      toast.success(t("profile.saved"))
    },
  })

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <form.AppField name="street" validators={{ onChange: z.string().min(1, t("validation.required")) }}>
          {(field) => <field.TextField label={t("address.street")} required />}
        </form.AppField>
        <form.AppField name="number">
          {(field) => <field.TextField label={t("address.number")} />}
        </form.AppField>
      </div>

      <form.AppForm>
        <form.SubmitButton label={t("common.save")} submittingLabel={t("common.saving")} />
      </form.AppForm>
    </form>
  )
}
```

- `<form.AppField>` (not `<form.Field>`) is what exposes `field.TextField` & co.
- `<form.AppForm>` is what exposes `form.SubmitButton`.
- `e.preventDefault()` then `form.handleSubmit()`. Always.
- Submission goes through a **TanStack Query mutation**, and success invalidates the queries
  the change affects. Never `fetch()` straight from `onSubmit` — the cache would go stale.

## Validation

**Per-field validators** (`validators={{ onChange: z.string().min(1, t("…")) }}`) are the
default: messages get translated at the call site, and the field owns its own rule.

Use a **whole-object schema** on the form (`validators: { onChange: addressSchema }`) when
the form maps 1:1 to a backend DTO or when rules span several fields (password confirmation,
date ranges). Both can coexist.

Client-side validation is UX. **The boundary is the .NET endpoint** — it validates the same
rules server-side, whatever the app uses (DataAnnotations, FluentValidation, …). Never rely
on the form having run.

## Server errors from ASP.NET

Two shapes, two treatments.

**Field-level** — the API answers `400` with `ValidationProblemDetails`
(`{ errors: { "Email": ["Already taken"] } }`). Give them back to the fields via the form's
`onSubmitAsync` validator, so they display exactly like a client-side error:

```ts
const form = useAppForm({
  defaultValues: { email: "", password: "" },
  validators: {
    onSubmitAsync: async ({ value }) => {
      try {
        await mutateAsync(value)
        return null
      } catch (error) {
        const problem = error as { errors?: Record<string, string[]> }
        if (!problem.errors) return { form: t("errors.unexpected") }
        // ASP.NET PascalCases the keys — lowercase them to match the field names
        return {
          fields: Object.fromEntries(
            Object.entries(problem.errors).map(([key, messages]) => [
              key.charAt(0).toLowerCase() + key.slice(1),
              messages[0],
            ]),
          ),
        }
      }
    },
  },
})
```

Check the return shape against the installed `@tanstack/react-form` version before writing
it — this API moved in v1.

**Global** — `401`, `403`, `409`, or anything you cannot attribute to a field: keep it in a
plain `useState<string | null>` and render it in a banner above the form. That is what the
reference codebase does for login (`invalidCredentials`, `emailNotVerified`). A toast is
acceptable for a save that failed for an unrelated reason; an authentication error belongs
in the form, where the user is looking.

Never map a `500` onto a field.

## Common cases

- **Save only when dirty** — subscribe to `isDirty` and hide the whole action row until
  something changed:

  ```tsx
  <form.Subscribe selector={(s) => ({ isDirty: s.isDirty, isSubmitting: s.isSubmitting })}>
    {({ isDirty, isSubmitting }) =>
      isDirty || isSubmitting ? (
        <Button disabled={!isDirty || isSubmitting} type="submit">…</Button>
      ) : null
    }
  </form.Subscribe>
  ```

- **Dates** — keep the field value as an ISO `yyyy-MM-dd` string, not a `Date`. The
  `DateField` parses it for the shadcn `Calendar` (inside a `Popover`) and formats back with
  `date-fns`. Strings survive JSON, `Date` objects do not, and .NET binds `DateOnly` cleanly.
- **Selects** — `onValueChange={field.handleChange}`, `value={field.state.value ?? ""}`,
  and `onBlur={field.handleBlur}` on the `SelectTrigger` (Radix does not blur the hidden
  input for you).
- **Repeatable rows** — `<form.AppField name="lines" mode="array">` with
  `field.pushValue()` / `field.removeValue(i)`; nested fields are `lines[0].label`.
- **Async validation** (uniqueness) — `onChangeAsync` + `onChangeAsyncDebounceMs` on the
  field, hitting the API. Debounce is mandatory; do not ship a request per keystroke.
- **Uploads** — `FormData` to a dedicated endpoint; MIME type and size are re-checked in the
  .NET handler before the file touches storage.
- **Optional fields with a text input** — model as `z.union([z.literal(""), realSchema])`.
  An empty input is `""`, never `undefined`.

## Do not

- Port react-hook-form idioms: there is no `register()`, no `watch()`, no `rules`.
- Use `<form.Field>` directly in feature code — you lose the typed field components.
- Build a generic schema-driven form generator. It collapses on the first non-trivial layout.
  (The one exception in the reference codebase is the CMS form-builder plugin, which renders
  admin-defined forms and has its own isolated `createFormHook` instance.)
- Duplicate Label + Input + error markup in a feature. If a field type is missing, add it to
  `src/forms/fields/`.
