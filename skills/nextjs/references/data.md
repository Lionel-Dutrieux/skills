# Reads

## The actor

`features/auth/data/actor.ts` resolves the signed-in user once per request. With Payload
embedded, the actor is Payload's user:

```ts
import 'server-only'

export const getActor = cache(async () => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user
})

export const requireActor = async () => (await getActor()) ?? redirect('/login')
```

Headless, the actor also carries the user's token: `references/headless.md`.

## A DAL module

```ts
// features/posts/data/posts.ts
import 'server-only'

export type PostDto = { id: string; title: string }

const toPostDto = (post: Post): PostDto => ({ id: post.id, title: post.title })

export const getPosts = async (actor: User): Promise<PostDto[]> => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'posts',
    user: actor,
    overrideAccess: false,
    depth: 0,
    limit: 50,
  })
  return docs.map(toPostDto)
}
```

Every list has a `limit`. `depth` is the smallest the DTO needs.

## TanStack Query

Follow Next.js's guide, `02-guides/client-side-data-fetching/tanstack-query.md` in the
bundled docs (provider, `HydrationBoundary`). Two conventions on top:

- A feature's query options live in `lib/queries.ts`, built with `queryOptions`, keys
  starting with the feature's name: `postQueries.list()` → `['posts']`.
- On the server, the prefetch replaces `queryFn` with the DAL call; in the browser,
  `queryFn` fetches the route handler.

## A GET route handler

```ts
// app/api/posts/route.ts
export const GET = async (request: Request) => {
  const actor = await getActor()
  if (!actor) return Response.json({ error: 'unauthorized' }, { status: 401 })

  return Response.json(await getPosts(actor, loadPostsSearchParams(request)), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
```

## Tests

`server-only` throws outside a Server Component, so `vitest.setup.ts` replaces it, as
Next.js's testing guide does: `vi.mock('server-only', () => ({}))`. A test in `tests/int/`
then imports `data/` directly and calls it with an actor.
