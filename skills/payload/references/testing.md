# Testing against Payload

Integration tests boot Payload on a real Postgres and go through the Local API, as
Payload's official templates do. The layout and the Vitest projects: `typescript` skill,
`references/testing.md`.

## Setup

- `DATABASE_URL` points at a test database, never at a shared one. `vitest.setup.ts`
  loads it (`import 'dotenv/config'`), and `test.env` sets the `NODE_OPTIONS` Payload needs.
- The test database gets the same chain as every other: `pnpm payload migrate` against it
  before `pnpm test:int`.
- A spec gets Payload once, in `beforeAll`:

```ts
let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})
```

## Writing a spec

- Act as someone: create the users the spec needs in `beforeAll`, then call with
  `user` and `overrideAccess: false`, the way the DAL does. `overrideAccess: true` is for
  arranging data, never for the call under test.
- An access rule is checked by what the actor gets back: the documents it may see, a
  `Forbidden` for what it may not do.
- Each spec writes rows it can recognize (an email such as `<spec>-<n>@test.local`) and
  deletes them in `afterAll`. The `int` project runs one file at a time; a spec still
  never depends on what another left behind.
- A hook is tested through the operation that triggers it; a task, by queuing it and
  running the queue (`payload.jobs.run()`).
- A call to the network is replaced by a fake from `tests/helpers/`.

## End to end

Admin flows are Playwright specs in `tests/e2e/`, signing in through a helper that seeds
the test user, as the official template's `tests/helpers/` does.
