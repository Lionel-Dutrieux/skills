# The API contract: .NET → TypeScript

The seam between the two halves of this stack. It is generated, never written, and the
generation is checked in CI.

Reference implementation: `Keyes-CSP` (`web/portal-spa/orval.config.ts`,
`web/portal-spa/src/api/`, `scripts/check-api-client-drift.ps1`).
Docs: [react-query](https://orval.dev/docs/guides/react-query) ·
[zod](https://orval.dev/docs/guides/zod) — read them before changing the config, the option
names move between majors.

## The chain

```
Portal.WebApi (C#)
  └─ dotnet run --project src/Portal.WebApi -- --generate-openapi artifacts/openapi/v1.json
       └─ orval  (web/portal-spa/orval.config.ts)
            └─ src/api/generated/**        ← COMMITTED
                 └─ src/api/http-client.ts ← hand-written mutator, the only fetch in the app
```

Four rules hold it together:

1. **The OpenAPI document is produced by the API's own source**, through a CLI mode of the
   WebApi that writes the file and exits. It runs with no reachable database, so the pipeline
   can generate a contract without infrastructure.
2. **The raw contract is not committed** (`artifacts/` is git-ignored). It is a build output.
3. **The generated client *is* committed.** That is what makes drift visible in code review —
   a diff over named hooks and types, not over a JSON blob — and what lets a single script
   detect it.
4. **A drift check runs in CI** and fails the build when the committed client no longer
   matches the contract. Touching an endpoint without regenerating stops the pipeline.

Changing an endpoint therefore means: change the C#, regenerate, commit both. In that order,
in the same commit.

## orval configuration

```ts
// web/portal-spa/orval.config.ts
export default defineConfig({
  portal: {
    input: "../../artifacts/openapi/v1.json",
    output: {
      mode: "tags-split",
      target: "src/api/generated/portal.ts",
      client: "react-query",
      httpClient: "fetch",
      prettier: false,
      clean: true,
      override: {
        mutator: { path: "./src/api/http-client.ts", name: "httpClient" },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
})
```

- `client: "react-query"` — orval generates the **hooks and the plain request functions**, not
  just the types. Never re-declare a fetcher or a response type that already exists; wrapping
  the generated ones is another matter, see below.
- `mode: "tags-split"` — one module per OpenAPI tag, so the C# endpoint groups map onto
  readable TS modules.
- `httpClient: "fetch"` — pinned rather than relied on as a default; no axios in this stack.
- `clean: true` — otherwise an orphan file from a deleted endpoint survives and the drift
  check compares against something the contract no longer produces.
- `includeHttpResponseReturnType: false` — **required when you supply a mutator that returns
  the parsed body**. Without it the generated types announce `{ data, status, headers }` while
  the runtime returns `T`. `tsc` cannot catch that: the generated code is internally
  consistent, it is just consistently wrong about reality.

## Zod schemas from the same contract

A **second orval target** turns the same OpenAPI document into Zod schemas. Add it next to the
client target rather than in place of it — one contract, two outputs:

```ts
export default defineConfig({
  portal: { /* client: "react-query" — as above */ },
  portalZod: {
    input: "../../artifacts/openapi/v1.json",
    output: {
      client: "zod",
      mode: "tags-split",
      target: "src/api/generated/zod",
      clean: true,
      override: {
        zod: { version: 4 },   // pin the emitted syntax; "auto" drifts with the installed zod
      },
    },
  },
})
```

What they are for, in order of value:

1. **Form validation.** A request body is already described by the contract — required
   fields, lengths, patterns, enums. Use the generated schema as the TanStack Form validator
   instead of retyping those rules, and the client-side rules follow the server's by
   construction. Compose on top for what the contract cannot express (password confirmation,
   a message the user should read) — `.extend()`, `.refine()`, or a per-field validator
   alongside. → `references/forms.md`
2. **Runtime validation at genuinely untrusted boundaries** — a webhook payload, something out
   of `localStorage`, a response you have concrete reasons to distrust. Not every response:
   parsing every list on every render buys little against a contract the CI already pins.

The generated schemas are also the honest answer to the caveat below — types alone are a
compile-time promise, a `.parse()` is a runtime check. Reach for one when the promise is not
enough.

## The mutator

`src/api/http-client.ts` is the single place where a request leaves the app. Base URL, auth
header, `If-Match` propagation and error normalisation live there and nowhere else.

Its two jobs:

**Attach the bearer token.** MSAL registers a token provider once initialised, and clears it
on sign-out. Requests made before a provider is registered go out unauthenticated rather than
waiting on a token that may never come.

**Normalise every failure into one `ApiError`.** Non-2xx responses and network failures alike
are turned into a class that implements `ProblemDetails` and exposes the stable `errorCode`
extension:

```ts
export class ApiError extends Error implements ProblemDetails {
  readonly status?: number
  readonly detail?: string
  readonly extensions: Record<string, unknown>
  /** Stable code from the API's `errorCode` extension — this is what the UI translates. */
  readonly errorCode?: string
}
```

Consequences for feature code:

- Never inspect a `Response`, never read `res.ok`, never `await res.json()`. If you are
  writing any of that, you are bypassing the client.
- **Translate `errorCode`, never display `detail`.** `detail` is a diagnostic sentence written
  server-side; it is a last-resort fallback for a code this build does not know yet.
- Error codes are a **public contract**. Renaming one on the server breaks every client that
  branches on it — treat it as an API break, not a refactor.

## Contract hygiene on the C# side

These decide what the generated TypeScript looks like. Get them wrong and the front-end pays
for months.

- **String enums.** Register `JsonStringEnumConverter`, or every enum arrives in TS as a bare
  `number` and the UI ends up comparing magic constants.
- **Nullable reference types on** (`<Nullable>enable</Nullable>`). This is what makes the
  generator mark properties required vs optional. With it off, everything is optional and the
  compiler protects nothing.
- **Project to a DTO, never return an entity.** An entity on the wire carries columns nobody
  displays and ties the contract to the database schema.
- **`DateOnly` / `TimeOnly` / `decimal` cross as strings.** Keep them as strings in the SPA and
  format at render time (`date-fns`); do not parse a decimal into a JS `number` and lose cents.
- **Fix generator gaps with a schema transformer**, not by editing generated TS. Keyes-CSP adds
  an `IntegerFormatSchemaTransformer` to restore `"type": "integer"` on numeric schemas the
  built-in generator leaves untyped.

## Consuming the client

Two levels, and the distinction matters.

**Reads** call the generated hook directly, with the query key held in one place per resource
(`src/api/role-queries.ts` exports `ROLE_LIST_QUERY_KEY`). Never retype a key as a literal at
a call site — an invalidation that misses by one character fails silently.

**Writes go through a feature hook**, not the raw generated hook:

```ts
// src/features/roles/useRoleWrites.ts
export function useCreateRole(options?: …) {
  const afterWrite = useAfterWrite()
  return useMutation<RoleDetailDto, ApiError, SaveRoleRequest>({
    mutationFn: (request) => postApiRoles(request),   // generated FUNCTION, not the hook
    onSuccess: afterWrite,
    ...options,
  })
}
```

Two reasons, both from the reference implementation:

1. **orval's hooks take a `{ id, data }` envelope**, which leaks the generator's shape into
   every screen. Overriding `mutationFn` lets callers pass what they mean.
2. **Invalidations belong with the write, once.** Saving a role invalidates the role list, the
   user list *and* the session — the last two are easy to forget and matter: editing a role
   changes what every account carrying it can do, including the account doing the editing, and
   the shell's navigation is drawn from `/api/me`.

So: `useMutation` over a **generated request function** is the expected pattern. `useQuery`
re-implementing a generated fetcher is not.

**Optimistic concurrency.** When an endpoint answers with an `ETag`, read it alongside the
entity and hand it back through `If-Match` on write — the two travel together as one value:

```ts
export async function fetchRole(id: string): Promise<LoadedRole> {
  const role = await getApiRolesId(id)
  return { role, etag: getEntityETag(role) }
}
```

A screen that fetched the entity and then went looking for its version separately would send a
header describing a different read from the one on screen, which is exactly what `If-Match`
exists to prevent.

**Pagination is server-side and capped server-side.** Do not build a "load everything then
filter on the client" screen against a paginated endpoint.

## Do not

- Hand-edit anything under `src/api/generated/`. The next regeneration erases it, and the
  drift check fails first anyway.
- Add `axios`, or call `fetch` directly from a component or a hook.
- Retype by hand a validation rule the contract already carries — generate the Zod schema.
- Spread orval's `{ id, data }` envelope across the screens instead of wrapping it once.
- Regenerate against a stale `artifacts/openapi/v1.json` — the generation step re-runs the API
  CLI first, deliberately.
- Introduce a second HTTP path "just for this one endpoint". There is one client.
