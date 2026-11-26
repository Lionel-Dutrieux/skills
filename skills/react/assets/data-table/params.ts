import {
  createParser,
  parseAsArrayOf,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'

/**
 * What a data table keeps in the page address: `?page=2&perPage=50&sort=-name&q=smith`.
 *
 * The address is the table's only state: a page can be linked to, survives a
 * reload, and is read by the server, which fetches that page and nothing
 * else. `nuqs/server`: parsers free of React, which the page reads with a
 * loader and the table writes with `useQueryStates`.
 */

/** The page sizes offered. */
export const PAGE_SIZES = [25, 50, 100] as const

export type PageSize = (typeof PAGE_SIZES)[number]

/** A sort as Payload reads it: a field, descending when prefixed with `-`. */
export type SortValue<TField extends string> = `-${TField}` | TField

/**
 * A page number, from 1. An edited address — `page=0`, `page=-3`, `page=abc` —
 * reads as the first page rather than reaching Payload.
 */
export const parseAsPage = createParser({
  parse: (value) => {
    const page = Number(value)

    return Number.isSafeInteger(page) && page >= 1 ? page : null
  },
  serialize: String,
})

/**
 * The parsers of a table sorted by one of `fields`. A sort the table does not
 * offer falls back to `defaultSort`, so an edited address cannot sort on a
 * field nobody indexed.
 */
export const dataTableParams = <TField extends string>(
  fields: readonly TField[],
  defaultSort: SortValue<TField>,
) => ({
  page: parseAsPage.withDefault(1),
  perPage: parseAsNumberLiteral(PAGE_SIZES).withDefault(PAGE_SIZES[0]),
  q: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(
    fields.flatMap((field): SortValue<TField>[] => [field, `-${field}`]),
  ).withDefault(defaultSort),
})

/** Several values of one filter: `?status=active,suspended`. */
export const parseAsValues = <TValue extends string>(values: readonly TValue[]) =>
  parseAsArrayOf(parseAsStringLiteral(values)).withDefault([])

/** Several ids of one filter, whatever they are. */
export const parseAsIDs = parseAsArrayOf(parseAsString).withDefault([])

/** The value a facet offers for "none": a row whose field is empty (`oneOf` in `where.ts`). */
export const NONE = 'none'

/** One page of rows, as the server answers it. */
export type Page<TRow> = {
  rows: TRow[]
  /** Every row the query matches, all pages together. */
  total: number
}
