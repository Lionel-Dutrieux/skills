# Testing

Vitest and Playwright — the same split PayloadCMS itself uses, so tests look the same in a
Payload app and in a plain Next.js app.

| Layer | Tool | File suffix | Scope |
|---|---|---|---|
| Unit | Vitest | `*.spec.ts` | Pure logic, schemas, formatters. No I/O, no bootstrap. |
| Component | Vitest + Testing Library | `*.spec.tsx` | A React component in isolation, jsdom. |
| Integration | Vitest | `*.int.spec.ts` | Real database / real Payload instance, Local API, hooks, endpoints. |
| End-to-end | Playwright | `*.e2e.spec.ts` | Real browser, real UI flows. |

Never Jest, Mocha, Cypress, Selenium or Puppeteer.

## Choosing a layer

- **Unit** for anything that is a function of its inputs — Zod schemas, date helpers,
  permission predicates. Fast, no setup.
- **Integration** when you need real persistence: does this action actually write the row,
  does this access control rule actually deny, does this hook actually fire.
- **E2E** for behavior that only a browser can produce — focus management, drag & drop,
  contenteditable, file uploads, live preview iframes, multi-step flows.
- **Component** for interactive UI in isolation. Do not use it to re-test what an E2E test
  already covers.

Test behavior through the public surface. Do not assert on implementation details, do not
snapshot entire component trees.

## Vitest config

```ts
// vitest.config.ts
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.spec.{ts,tsx}"],
  },
})
```

Scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:int": "vitest run --config vitest.int.config.ts",
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed"
}
```

Integration tests need a real database, so they get their own config (Node environment, no
jsdom, longer timeouts) rather than being mixed into the unit run.

## Unit test

```ts
import { describe, expect, it } from "vitest"
import { createPostSchema } from "./schema"

describe("createPostSchema", () => {
  it("rejects a title shorter than 3 characters", () => {
    const result = createPostSchema.safeParse({ title: "ab", body: "content" })
    expect(result.success).toBe(false)
  })
})
```

## Integration test

**Tests must clean up after themselves.** Anything created during a test is deleted before
it ends — track ids and delete in `afterEach`. Tests that leave rows behind make the next
run fail for reasons that have nothing to do with the code.

```ts
import { afterEach, describe, expect, it } from "vitest"
import { inArray } from "drizzle-orm"
import { db } from "@/db"
import { posts } from "@/db/schema"

const createdIds: string[] = []

afterEach(async () => {
  if (createdIds.length) {
    await db.delete(posts).where(inArray(posts.id, createdIds))
    createdIds.length = 0
  }
})

describe("posts", () => {
  it("persists a post", async () => {
    const [post] = await db
      .insert(posts)
      .values({ title: "Hello", body: "World", authorId: TEST_USER_ID })
      .returning()
    createdIds.push(post.id)

    expect(await db.query.posts.findFirst({ where: (p, { eq }) => eq(p.id, post.id) }))
      .toMatchObject({ title: "Hello" })
  })
})
```

Same discipline with Payload: `payload.create(...)` in the test, `payload.delete(...)` in
`afterEach`. Point integration tests at a dedicated test database — never a shared one.

## E2E test

```ts
import { expect, test } from "@playwright/test"

test("a user can create a post", async ({ page }) => {
  await page.goto("/posts/new")
  await page.getByLabel("Title").fill("My post")
  await page.getByLabel("Body").fill("Body content")
  await page.getByRole("button", { name: "Create post" }).click()

  await expect(page.getByText("Post created")).toBeVisible()
})
```

- Select by role, label or text — user-visible handles. `data-testid` is a last resort,
  never a CSS selector chain.
- Playwright auto-waits on assertions. Never `waitForTimeout`.
- Authenticate once via a storage-state setup project instead of logging in through the UI
  in every test.

## What to test first

Money, permissions, and data loss. An access control rule that silently returns `true` is
worth more tests than a component's class names.
