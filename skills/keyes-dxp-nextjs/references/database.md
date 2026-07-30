# Database — Drizzle ORM

Drizzle everywhere. Never Prisma, TypeORM or Kysely. The reason is alignment: PayloadCMS's
Postgres adapter is Drizzle under the hood, so the CMS and the application share one query
layer, one connection and one migration story.

## Setup

```ts
// db/index.ts
import { drizzle } from "drizzle-orm/node-postgres"
import { env } from "@/env"
import * as schema from "./schema"

export const db = drizzle(env.DATABASE_URL, { schema })
```

Passing `schema` is what enables the relational query API (`db.query.*`). Do not skip it.

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

## Schema

```ts
// db/schema.ts
import { relations } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}))

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
```

- Derive types with `$inferSelect` / `$inferInsert`. Never hand-write a row interface.
- Timestamps are `withTimezone: true` and stored in UTC. Format at render time with
  `date-fns`.
- Add indexes for every column you filter or sort on in a real query path.

## Queries

```ts
// Relational API — reads
const post = await db.query.posts.findFirst({
  where: (posts, { eq }) => eq(posts.id, id),
  with: { author: true },
})

// Query builder — writes
const [created] = await db.insert(posts).values(input).returning()
```

Rules:

- Query the database in Server Components, server actions, and route handlers only. Never
  ship `db` to a client component.
- Scope every user-facing query by ownership or permission (`where eq(posts.authorId, userId)`).
  Authorization is a `where` clause, not a UI condition.
- Select the columns you need on wide tables rather than `SELECT *` by default.
- Wrap multi-statement mutations in `db.transaction(async (tx) => { ... })`.
- Zod validates the input shape; the schema constrains the storage shape. Both, not one.

## Migrations

```bash
pnpm drizzle-kit generate     # generate SQL from schema changes
pnpm drizzle-kit migrate      # apply them
```

Generated SQL is committed and reviewed like any other code. `drizzle-kit push` is for
local prototyping only — never against a shared or production database.

## With PayloadCMS

- Payload owns its own tables and generates their schema from collection configs. Do not
  hand-edit them or model them again in `db/schema.ts`.
- Application-specific tables live in your Drizzle schema alongside them, in the same
  database.
- Payload documents are read and written through the Local API (`payload.find`,
  `payload.create`), which enforces hooks and access control. Reaching into Payload's
  tables with raw Drizzle bypasses all of that — only do it for read-only reporting, never
  for writes.
- Payload exposes its Drizzle instance (`payload.db.drizzle`) when you genuinely need one
  connection for a cross-cutting transaction.
