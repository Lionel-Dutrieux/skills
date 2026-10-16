# Lists: search, filters, sort, pagination

The state of a list lives in the URL, and the server renders every state of it. A link
restores the exact view, the page works before JavaScript loads, and each change of filter
or page is a navigation the server answers.

## The parsers

One set per feature, in `lib/search-params.ts`, imported from `nuqs/server` so server and
client code can both use it:

```ts
export const postsSearchParams = {
  q: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['newest', 'oldest']).withDefault('newest'),
  page: parseAsInteger.withDefault(1),
}

export const loadPostsSearchParams = createLoader(postsSearchParams)
export const serializePostsSearchParams = createSerializer(postsSearchParams)

export type PostsQuery = Awaited<ReturnType<typeof loadPostsSearchParams>>
```

## The page parses, the DAL paginates

```tsx
// app/posts/page.tsx
const PostsPage = async ({ searchParams }: PageProps<'/posts'>) => {
  const actor = await requireActor()
  const query = await loadPostsSearchParams(searchParams)
  return <PostsScreen actor={actor} query={query} />
}
```

The DAL hands filter, sort and page to Payload, which counts and slices:

```ts
const result = await payload.find({
  collection: 'posts',
  user: actor,
  overrideAccess: false,
  where: query.q ? { title: { like: query.q } } : {},
  sort: query.sort === 'newest' ? '-createdAt' : 'createdAt',
  page: query.page,
  limit: PAGE_SIZE,
  depth: 0,
})

return { items: result.docs.map(toPostDto), page: result.page ?? 1, totalPages: result.totalPages }
```

## The screen

- The list sits in a `<Suspense>` keyed on the serialized query, so a new search shows its
  fallback instead of the stale results:
  `<Suspense key={serializePostsSearchParams(query)} fallback={…}>`.
- Pagination is plain links, built by the serializer from the current query:
  `<Link href={serializePostsSearchParams('/posts', { ...query, page: page + 1 })}>`. They
  work without JavaScript and Next.js prefetches them.

## Filters

The only Client Component. It writes the URL, and `shallow: false` makes the server render
again. Changing a filter resets the page.

```tsx
const [{ q, sort }, setQuery] = useQueryStates(postsSearchParams, { shallow: false })

<input
  type="search"
  value={q}
  onChange={(event) =>
    setQuery({ q: event.target.value, page: null }, { limitUrlUpdates: debounce(300) })
  }
/>
```

`NuqsAdapter` from `nuqs/adapters/next/app` wraps the root layout once.

## Beyond pages

An infinite scroll, or a list the browser keeps fresh, moves to TanStack Query
(`references/data.md`): the same parsers give its query key, and its route handler parses
the request with the same loader, `loadPostsSearchParams(request)`.
