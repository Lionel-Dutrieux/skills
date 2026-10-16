# Migrations

With `push: false`, a migration is the only way the schema changes, in development as in
production. Development applies the chain with `pnpm payload migrate`; production applies
it at boot through `prodMigrations`, which runs only when `NODE_ENV` is `production`.

## Changing the schema

1. Change the config: a collection, a field, a global, a plugin that adds them.
2. `pnpm payload migrate:create <name>`. It runs offline, never touching a database, and
   writes `src/migrations/<timestamp>_<name>.ts`, its `.json` snapshot, and its entry in
   `src/migrations/index.ts`.
3. `pnpm payload migrate` applies it to the local database.
4. Regenerate what the change affects:

| Change | Command | File |
|---|---|---|
| A collection, field or global | `pnpm payload generate:types` | `src/payload-types.ts` |
| The same, when Drizzle reads the tables | `pnpm payload generate:db-schema` | `src/payload-generated-schema.ts` |
| An admin component added or moved | `pnpm payload generate:importmap` | `src/app/(payload)/admin/importMap.js` |

5. Commit the migration, its snapshot, `index.ts` and the regenerated files together.

After pulling someone else's migrations: `pnpm payload migrate`. Generated files change
only through their command, and ESLint and Prettier leave them as Payload writes them.

## The chain

The generator compares the config with the newest `.json` snapshot, by name. Hence:

- A migration ships with its snapshot. Without it, the next migration restates what
  production already has, and the container fails at boot.
- A new migration's name sorts after the newest one. When it does not, rename its `.ts`
  and `.json`, and its entry in `index.ts`.
- A migration that has run in production stays as it is. A correction is a new migration.

## Data steps

The generated `up` and `down` hold the schema SQL. What the generator cannot infer — which
duplicate survives a new unique index, what fills a new column — is code added to them:

- ``db.execute(sql`...`)`` for set-based work. It replays identically on a fresh
  database, whatever the code becomes.
- The Local API with `req` (`payload.update({ ..., req })`) only when the collection's
  hooks must run on each document.

A data-only migration: `pnpm payload migrate:create <name> --force-accept-warning`.
