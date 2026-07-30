# Server actions

Every mutation goes through `next-safe-action`. Nothing else is acceptable.

## The three rules

1. **Mutations only.** A server action never reads data for display. Reads belong in
   Server Components (direct DB/Payload access) or in route handlers consumed by TanStack
   Query. A `getUsers()` server action called from a `useEffect` is the exact anti-pattern
   this rule exists to prevent.
2. **Every input is validated** by a Zod schema through `.inputSchema()`. Raw `FormData`
   or loosely-typed params are never consumed directly.
3. **Every sensitive action re-checks authorization server-side** through the
   `authActionClient` middleware — even if the UI already hides the action. Client-side
   gating is a UX affordance, not a security boundary.

## Clients

Define these once, in `lib/safe-action.ts`.

```ts
import { createSafeActionClient } from "next-safe-action"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"

export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({ actionName: z.string() })
  },
  handleServerError(error) {
    console.error("Server action error:", error.message)
    return "Something went wrong. Please try again."
  },
})

/** Any action touching user data or state changes must use this client. */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    throw new Error("UNAUTHORIZED")
  }

  return next({ ctx: { user: session.user, session } })
})

/** Narrow further when an action requires a specific role. */
export const adminActionClient = authActionClient.use(async ({ next, ctx }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("FORBIDDEN")
  }
  return next({ ctx })
})
```

## An action

```ts
"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/db"
import { posts } from "@/db/schema"
import { authActionClient } from "@/lib/safe-action"

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
})

export const createPost = authActionClient
  .metadata({ actionName: "createPost" })
  .inputSchema(createPostSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [post] = await db
      .insert(posts)
      .values({ ...parsedInput, authorId: ctx.user.id })
      .returning()

    revalidatePath("/posts")
    return { post }
  })
```

Notes:

- `parsedInput` is typed from the schema — never re-declare the type by hand.
- `ctx.user` comes from the middleware, so the action cannot forget who is calling.
- Ownership checks belong inside the action (`where eq(posts.authorId, ctx.user.id)`),
  not only in the middleware.

## Calling it from a client component

```tsx
"use client"

import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"
import { createPost } from "./actions"

export function CreatePostButton() {
  const { execute, isPending } = useAction(createPost, {
    onSuccess: () => toast.success("Post created"),
    onError: ({ error }) => toast.error(error.serverError ?? "Failed"),
  })

  return (
    <Button
      disabled={isPending}
      onClick={() => execute({ title: "Hello", body: "World" })}
    >
      Create
    </Button>
  )
}
```

For form-driven mutations, wire this into TanStack Form — see `forms.md`. An action never
throws across the boundary: handle `serverError` and `validationErrors` explicitly rather
than wrapping the call in `try/catch`.

## After a mutation

- Server-rendered data → `revalidatePath()` / `revalidateTag()`.
- Client TanStack Query cache → `queryClient.invalidateQueries({ queryKey: [...] })`.
- Both, when a page mixes the two.
