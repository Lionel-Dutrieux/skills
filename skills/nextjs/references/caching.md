# Caching

Cache Components are on in both shapes. Read Next.js's own pages before changing any of
this: `01-getting-started/08-caching.md`, `02-guides/migrating-to-cache-components.md`,
`02-guides/incremental-static-regeneration-cache-components.md` and
`03-api-reference/01-directives/use-cache.md` in the bundled docs. `next dev` reports in
its log what the build does not: read it after a change.

## Never `unstable_cache`

Next 16 replaced `unstable_cache` with `'use cache'`. It still runs, as the previous
model: nothing is written with it any more, and what still uses it is migrated. A plugin
caches nothing at all: it gives a read that needs nothing of the request and the tags of
what the read holds (`settingsTags`, `themesTags`, `messagesTags`, routes'
`resolveRoute`), and the app writes the `'use cache'`.

## The `content` profile

```ts
// next.config.ts
cacheLife: {
  content: {
    expire: 60 * 60 * 24 * 365,
    revalidate: 60 * 60 * 24 * 30,
    stale: 30,
  },
},
```

`stale` is how long a visitor's browser reuses a page without asking the server. Next
refuses less than 30 seconds for a page it prerenders; `max` sets five minutes, and an
editor who comes back to a page they just published sees the old one. On the server, the
entry is kept until the CMS invalidates its tag, and the revalidate plugin expires it at
once (`{ expire: 0 }`, its default): the next visit reads Payload again.

`typecheck` runs `next typegen` first (`next typegen && tsc --noEmit`): the profile's
name and the exports of `next/root-params` are typed from generated files.

## A cached read

A public read is a function of a feature's `data/`. What it is called with is its cache
key, what it returns is plain values (a `URL` or a `Date` is none), and its tags name
what it holds:

```ts
// features/forms/data/forms.ts
import 'server-only'

const publishedForm = async (id: string, locale: Locale): Promise<FormDto> => {
  'use cache'

  cacheLife('content') // kept until the CMS invalidates it
  cacheTag(tags.doc('forms', id))

  const payload = await getPayload({ config })
  const form = await payload.findByID({ id, collection: 'forms', depth: 0, locale, overrideAccess: false })

  return toFormDto(form)
}
```

- Tags come from `createTags<Config>()` of `@lionel-dutrieux/payload-revalidate/next`, in
  `src/lib/tags.ts`. Every collection or global a read tags is listed in
  `revalidatePlugin`: the CMS invalidates the read, and the pages that hold it.
- Nothing of the request is read inside: `headers()` and `cookies()` throw there. Pass
  what the read needs as arguments.
- React's `cache()` shares a read within one render (the page and its
  `generateMetadata`). It keeps nothing between requests.
- A read for one user is never cached.

## A public page is prerendered

A page that reads the request (`headers()`, `cookies()`, `connection()`, `searchParams`)
cannot be prerendered: Next sends its status, `200`, before it renders, so `notFound()`
and `redirect()` come too late. A public page reads its URL and cached data only, and its
layout says so:

```tsx
// app/[site]/[locale]/layout.tsx
export const ensureStatic = 'navigation'
```

Next then prerenders each page at its first visit, waits for it, keeps it, and answers
with the page's own status: `404`, `308`. An uncached read fails the page, in `next dev`
with its stack.

The page awaits its `params` under `<Suspense>`, so the document around it is the same
for every page:

```tsx
const PageAtUrl = async ({ params }: Props) => {
  const { locale, path } = await params

  return <PageScreen locale={locale} page={await getPage(locale, path)} />
}

const Page = ({ params }: Props) => (
  <Suspense>
    <PageAtUrl params={params} />
  </Suspense>
)
```

`generateStaticParams` returns at least one value for each parameter. A build reads no
database: it returns a value the layout answers with `notFound()` before any read.

## Several tenants

The tenant is in the page's URL, never read from the request. The proxy writes the
request's host as the first segment of the page's own URL, without reading the database:

```ts
// src/proxy.ts
export const proxy = (request: NextRequest) => {
  const response = handleI18nRouting(request)

  if (!response.ok) {
    return response
  }

  const { pathname, search } = new URL(response.headers.get('x-middleware-rewrite') ?? request.url)
  const site = siteKeyOf(request.headers.get('host'))

  return NextResponse.rewrite(new URL(`/${site}${pathname}${search}`, request.url), {
    headers: response.headers,
  })
}
```

The key holds no dot (a host's dots as underscores), so a URL that carries one goes
through the proxy, which adds the request's own: no visitor picks a site by its URL.

`requestTenant()` reads that segment with `next/root-params`, which a cached function may
call too: the segment becomes part of its key.

```ts
// features/tenants/data/tenants.ts
export const requestTenant = cache(async (): Promise<null | string> => {
  const host = hostOfSiteKey(await site())

  return host === null ? null : tenantOfHost(host) // a `'use cache'` lookup
})
```

next-intl reads the language the same way (`locale` from `next/root-params` in
`src/i18n/request.ts`), without `setRequestLocale`.

## What stays rendered at each request

- A route handler that answers for the request's host (`sitemap.ts`, `robots.ts`) awaits
  `connection()` first.
- Draft mode: Next bypasses every cache while it is on, and the page reads the draft.
- Payload's admin. Its layout sets `instant = false` and awaits `connection()`.
