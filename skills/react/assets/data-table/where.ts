import type { Where } from 'payload'

import { NONE } from './params'

/**
 * The pieces a DAL builds a table's `where` from. The `where` itself stays in
 * the DAL: what a filter means is the feature's business.
 */

/** `field` is one of `values`, or — for `NONE` among them — empty. No value, no clause. */
export const oneOf = (field: string, values: readonly string[]): null | Where => {
  if (values.length === 0) {
    return null
  }

  const some = values.filter((value) => value !== NONE)
  const clauses: Where[] = [
    ...(some.length > 0 ? [{ [field]: { in: some } }] : []),
    ...(values.includes(NONE) ? [{ [field]: { exists: false } }] : []),
  ]

  return clauses.length === 1 ? clauses[0]! : { or: clauses }
}

/** The search, on any of `fields`. An empty search, no clause. */
export const searchIn = (fields: readonly string[], q: string): null | Where => {
  const search = q.trim()

  return search ? { or: fields.map((field) => ({ [field]: { like: search } })) } : null
}

/** The tenant's rows, under every clause given; `null` clauses are dropped. */
export const inTenant = (tenant: string, clauses: (null | Where)[]): Where => ({
  and: [{ tenant: { equals: tenant } }, ...clauses.filter((clause) => clause !== null)],
})
