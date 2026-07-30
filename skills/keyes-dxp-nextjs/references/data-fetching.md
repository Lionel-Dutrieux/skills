# Data fetching and state

## Decision order

Ask these in order and stop at the first "yes":

1. **Can a Server Component fetch it?** Then do that — direct DB / Payload Local API call,
   no client JS, no loading state.
2. **Is it UI state that belongs in the URL** (filters, pagination, tabs, search, sort)?
   Then `nuqs`. Shareable, back-button friendly, survives reload.
3. **Does the client genuinely need to fetch or refetch it** (polling, infinite scroll,
   optimistic UI, user-triggered)? Then TanStack Query against a route handler.
4. **Is it purely local UI state?** `useState`.
5. **Is it global, purely-UI, and shared across distant components?** Only then `zustand`.

Never `useEffect` + `fetch`. Never a server action for reads.

## Server Component fetch

```tsx
// app/posts/page.tsx
import { db } from "@/db"

export default async function PostsPage() {
  const posts = await db.query.posts.findMany({ orderBy: (p, { desc }) => desc(p.createdAt) })
  return <PostList posts={posts} />
}
```

For external APIs use native `fetch` with explicit caching — it is no longer cached by
default:

```ts
const res = await fetch("https://api.example.com/items", {
  next: { revalidate: 60, tags: ["items"] },
})
if (!res.ok) throw new Error(`Upstream failed: ${res.status}`)
const items = itemsSchema.parse(await res.json()) // validate external data
```

No axios, no ky. Validate anything crossing the network boundary with Zod.

## URL state with nuqs

Mount the adapter once:

```tsx
// app/layout.tsx
import { NuqsAdapter } from "nuqs/adapters/next/app"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}
```

```tsx
"use client"

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"

export function ProductFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      category: parseAsString,
    },
    { shallow: false }, // notify the server so RSCs re-render
  )

  return (
    <Input
      value={filters.q}
      onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
    />
  )
}
```

`useQueryStates` batches related params into one history entry — prefer it over several
`useQueryState` calls. Debounce text inputs with TanStack Pacer, not a hand-rolled
`setTimeout`.

## TanStack Query

Provider (client component, stable `QueryClient` per browser session):

```tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Query — object syntax only (v5):

```tsx
const { data, isPending, error } = useQuery({
  queryKey: ["posts", { page }],
  queryFn: async () => {
    const res = await fetch(`/api/posts?page=${page}`)
    if (!res.ok) throw new Error("Failed to load posts")
    return postsSchema.parse(await res.json())
  },
})
```

Query keys are structured arrays (`["posts", { page }]`), so invalidation can be partial.
Colocate key factories next to the queries that use them.

## Route handlers

Client fetching targets route handlers, not server actions. Validate search params, keep
the handler thin, reuse the same data functions the Server Components use.

```ts
// app/api/posts/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { getPosts } from "@/lib/posts"

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  return NextResponse.json(await getPosts(parsed.data))
}
```

Authenticated route handlers check the session exactly like `authActionClient` does —
being read-only does not exempt them from authorization.

## zustand

Justify it before you write it. Valid: a complex editor's transient UI state shared across
distant components. Not valid: server data (TanStack Query), form state (TanStack Form),
filters (nuqs), anything a Server Component already knows.
