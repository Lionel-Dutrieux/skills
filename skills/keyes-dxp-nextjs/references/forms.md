# Forms and validation

TanStack Form + Zod + next-safe-action. One schema, shared between client and server.

## The schema is the contract

Declare it once, in a file both sides import. Never write the same shape twice, never
declare a TypeScript interface next to a schema.

```ts
// features/posts/schema.ts
import { z } from "zod"

export const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  body: z.string().min(1, "Body is required"),
  publishedAt: z.date().optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
```

The server action validates it again with `.inputSchema(createPostSchema)`. Client
validation is UX; server validation is the actual boundary. Both are mandatory.

## The form

TanStack Form v1 takes Standard Schema validators directly — pass the Zod schema, no
adapter package.

```tsx
"use client"

import { useForm } from "@tanstack/react-form"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { createPost } from "./actions"
import { createPostSchema } from "./schema"

export function CreatePostForm() {
  const { executeAsync } = useAction(createPost)

  const form = useForm({
    defaultValues: { title: "", body: "" },
    validators: { onChange: createPostSchema },
    onSubmit: async ({ value }) => {
      const result = await executeAsync(value)

      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }
      toast.success("Post created")
      form.reset()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <form.Field
        name="title"
        children={(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Title</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-destructive text-sm">
                {field.state.meta.errors.map((e) => e?.message).join(", ")}
              </p>
            )}
          </div>
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Saving…" : "Create post"}
          </Button>
        )}
      />
    </form>
  )
}
```

Key differences from react-hook-form — do not port its idioms:

- Fields are **render props** (`<form.Field children={...} />`), there is no `register()`.
- Re-render scoping is done with `form.Subscribe`, not `watch()`.
- Validation runs from the schema in `validators`, not from per-field `rules`.

## Field components

Wrap the repeated Label + Input + error markup into a project-local field component built
on shadcn/ui primitives, and reuse it. Do not duplicate the block above in twenty files —
but do not build a generic schema-driven form generator either; it always collapses under
the first non-trivial layout.

## Server-side validation errors

`useAction` surfaces `validationErrors` when the action's schema rejects the input. Map
them back onto fields rather than showing a generic toast, so the user knows which field
failed.

## Common cases

- **Async validation** (uniqueness): `validators: { onChangeAsync, onChangeAsyncDebounceMs }`
  on the field, hitting a route handler.
- **Arrays / repeatable rows**: `form.Field` with `mode="array"`, plus `pushValue` /
  `removeValue`.
- **Dates**: shadcn/ui `Calendar` + `Popover`, formatted with `date-fns`. Store UTC,
  format at render time.
- **Uploads**: post to a route handler; validate MIME type and size server-side with Zod
  before touching storage.
