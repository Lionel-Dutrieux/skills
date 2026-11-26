# The headless front

`apps/web` depends on `@payloadcms/sdk` and on `cms-types` (types only), never on
`payload`. The CMS side, and how it writes `cms-types`: `payload` skill.

## The client

```ts
// src/lib/cms.ts
import 'server-only'

import { PayloadSDK } from '@payloadcms/sdk'
import type { Config } from 'cms-types'

export const cms = new PayloadSDK<Config>({ baseURL: `${env.CMS_URL}/api` })
```

Only the DAL imports `cms`.

## Signed-in users

1. A sign-in action calls `cms.login({ collection: 'users', data })` and stores the
   returned `token` in an HttpOnly, Secure, `SameSite=Lax` cookie, expiring at `exp`.
2. `getActor()` reads the cookie, calls `cms.me({ collection: 'users' }, auth)`, and
   returns `{ user, token }`, wrapped in `cache()`.
3. Every DAL call made for that user passes the token, so Payload applies its access
   control:

```ts
const auth = (actor: Actor) => ({ headers: { Authorization: `JWT ${actor.token}` } })

const { docs } = await cms.find({ collection: 'orders', limit: 20 }, auth(actor))
```

A read made for one user never goes in `'use cache'`.

## Cached public reads

`next.config.ts` sets `cacheComponents: true`. Tags are named as the plugin that
invalidates them names them, typed on the CMS config:

```ts
// features/pages/data/pages.ts
export const getPage = async (tenant: string, slug: string) => {
  'use cache'
  cacheLife('content')
  cacheTag(tags.key('pages', 'slug', slug))

  const { docs } = await cms.find({
    collection: 'pages',
    where: { and: [{ tenant: { equals: tenant } }, { slug: { equals: slug } }] },
    limit: 1,
  })
  return docs[0] ? toPageDto(docs[0]) : null
}
```

The tenant is an argument, so it is part of the cache key, and the `where` filters on it:
two tenants with the same slug get two entries (`references/caching.md`). A list, a menu
or a sitemap carries its collection's tag; a global, its own. Cached reads ask for
published content only.

## Invalidation

The CMS calls a route handler of the front after every published change, with a secret
both sides share: the plugin that invalidates says in its skill how to write it.

## Tracing across the two apps

`registerOTel` propagates the trace to the CMS:
`instrumentationConfig: { fetch: { propagateContextUrls: [env.CMS_URL] } }`. One trace then
covers the page, the CMS and its SQL: `references/observability.md`.
