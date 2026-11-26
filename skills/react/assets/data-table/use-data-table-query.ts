'use client'

import { debounce, type ParserMap, useQueryStates, type Values } from 'nuqs'
import { useTransition } from 'react'

import type { DataTableChange } from './data-table'
import type { dataTableParams } from './params'

/** The parameters every table has, whatever else it filters on. */
type TableParsers = Pick<ReturnType<typeof dataTableParams<string>>, 'page' | 'q'>

/**
 * A table's address, read and written: every change re-renders the page on
 * the server (`shallow: false`), inside a transition whose `pending` the
 * table dims itself with. The search is debounced, so typing asks for one
 * page, not one per letter.
 *
 * Called once per table, by the component that holds both the toolbar and
 * the table, so that the two share one transition.
 */
export function useDataTableQuery<TParsers extends ParserMap & TableParsers>(parsers: TParsers) {
  const [pending, startTransition] = useTransition()
  const [params, setParams] = useQueryStates(parsers, {
    scroll: false,
    shallow: false,
    startTransition,
  })

  return {
    /**
     * What the table asks for — a page, a size, a sort. The sort is a column's
     * id, and the sortable columns are exactly the fields the sort parser
     * accepts.
     */
    onTableChange: (change: DataTableChange) => setParams(change as Partial<Values<TParsers>>),
    params,
    pending,
    setParams,
    /** Writes the search, debounced, back on the first page. */
    setSearch: (q: string) =>
      setParams({ page: null, q: q === '' ? null : q } as Partial<Values<TParsers>>, {
        limitUrlUpdates: q === '' ? undefined : debounce(300),
      }),
  }
}
