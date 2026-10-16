# Server actions

## The clients

`src/lib/safe-action.ts` holds the only two clients. Their `handleServerError` is where an
action's unexpected errors are logged, once.

```ts
import 'server-only'

export type ServerError = 'forbidden' | 'unexpected'

export const actionClient = createSafeActionClient({
  handleServerError: (error): ServerError => {
    if (error instanceof Forbidden) return 'forbidden'
    logger.error({ err: error }, 'Server action failed')
    trace.getActiveSpan()?.recordException(error)
    return 'unexpected'
  },
})

export const authActionClient = actionClient.use(async ({ next }) =>
  next({ ctx: { actor: await requireActor() } }),
)
```

`Forbidden` is the access refusal of the data source: `Forbidden` from `payload` with the
Local API, a `PayloadSDKError` whose `status` is 403 through the SDK. Likewise `logger` is
`payload.logger` with Payload embedded (`handleServerError` can be `async` to get the
instance), `src/lib/logger.ts` in the headless front.

## An action

```ts
// features/posts/actions.ts
'use server'

export const createPostAction = authActionClient
  .inputSchema(createPostSchema)
  .action(async ({ ctx: { actor }, parsedInput }) => {
    const post = await createPost(actor, parsedInput)
    refresh()
    return { id: post.id }
  })
```

A business refusal (not enough credit, a slot already taken) is part of the result:
`return { refused: 'slot-taken' }`. The client translates it like a server error code.

## After the write

| The page shows | Call |
|---|---|
| Data read without cache (`next-payload`) | `refresh()` |
| Cached data, and the user must see their change now | `updateTag(tag)` |
| Cached data, where a stale read is acceptable | `revalidateTag(tag, 'max')` |
| Another page | `redirect(href)`, after the cache update |

## From the client

```tsx
const { executeAsync } = useAction(createPostAction)

const result = await executeAsync(input)
if (result?.serverError) toast.error(t(`errors.${result.serverError}`))
```

Inside a form, this call is the form's `onSubmit`: `react` skill, `references/forms.md`.
