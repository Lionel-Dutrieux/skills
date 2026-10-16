# Forms

TanStack Form through one typed hook, `useAppForm`, whose fields render shadcn's `Field`
markup. Feature code composes registered fields; label, input and error markup is written
once, in the field.

## Layout

```
src/components/form/
  form-contexts.ts     createFormHookContexts(); imports nothing local
  form.ts              createFormHook() → useAppForm, withForm
  submit-button.tsx
  fields/              text-field.tsx, select-field.tsx, checkbox-field.tsx…
```

The contexts get their own module because fields import them and `form.ts` imports the
fields: in one file, that import would loop back on itself.

```ts
// form-contexts.ts
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

// form.ts
export const { useAppForm, withForm } = createFormHook({
  fieldComponents: { TextField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
})
```

## A field

A field reads its state from `useFieldContext`. Its props are presentation only, with
`label` already translated.

```tsx
export const TextField = ({ label, description, ...props }: TextFieldProps) => {
  const field = useFieldContext<string>()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        {...props}
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={isInvalid}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
```

A new field type is a file in `fields/` written to this shape, registered in
`fieldComponents`. Every form then has it, typed, as `field.<Name>`.

## A feature form

The schema lives in the feature's `schemas.ts`, shared with whatever receives the data.

```tsx
const form = useAppForm({
  defaultValues: { title: '' } satisfies CreatePostInput,
  validators: { onSubmit: createPostSchema },
  onSubmit: async ({ value }) => submit(value),
})

<form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit() }}>
  <form.AppField name="title">{(field) => <field.TextField label={t('title')} />}</form.AppField>
  <form.AppForm><form.SubmitButton label={t('create')} /></form.AppForm>
</form>
```

## Submitting

`submit` depends on how the app reaches its server:

- **Next.js**: a server action, through next-safe-action (`nextjs` skill,
  `references/mutations.md`).
  ```tsx
  const { executeAsync } = useAction(createPostAction)

  const submit = async (value: CreatePostInput) => {
    const result = await executeAsync(value)
    if (result?.serverError) toast.error(t(`errors.${result.serverError}`))
  }
  ```
- **A React SPA in front of an API**: the mutation hook orval generates from the API's
  OpenAPI document, `const { mutateAsync } = useCreatePost()`, then
  `submit = (value) => mutateAsync({ data: value })`.

## Errors from the server

The same schema validates both sides, so a validation error from the server means a bug or
a tampered request: show the generic error. A business refusal comes back as a code
(`typescript` skill): translate it and show it with `toast.error`.

## Common cases

- **Dates**: the value is an ISO `yyyy-MM-dd` string, never a `Date`; the date field
  parses it for shadcn's `Calendar` and formats it back with date-fns. A string crosses
  the server boundary intact.
- **Optional text**: `z.union([z.literal(''), schema])`. An empty input is `''`, not
  `undefined`.
- **Select**: `onValueChange={field.handleChange}`, and `onBlur={field.handleBlur}` on the
  `SelectTrigger`, which does not blur on its own.
- **Repeatable rows**: `<form.AppField name="lines" mode="array">`, with
  `field.pushValue()` and `field.removeValue(index)`; nested names read `lines[0].label`.
- **Async validation** (a unique email): `onChangeAsync` with `onChangeAsyncDebounceMs`.
- **Uploads**: the server parses type and size again before storing anything.

Each form is written out with registered fields. A form generated from a schema breaks on
the first layout that does not fit it.
