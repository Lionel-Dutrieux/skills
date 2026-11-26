'use client'

import type { CellData, ColumnHelper, RowData, TableFeatures } from '@tanstack/react-table'

import {
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  type RowSelectionState,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import { useHotkeys } from '@tanstack/react-hotkeys'
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type MouseEvent, type ReactNode, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { DataTablePagination } from './data-table-pagination'
import { DataTableViewOptions, type Density, useDensity } from './data-table-view-options'
import type { PageSize } from './params'
import { useStickyHead } from './use-sticky-head'

declare module '@tanstack/react-table' {
  // The type parameters must be named as TanStack's own, for the two to merge.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    /** Numbers, right-aligned, header included. */
    numeric?: boolean
    /** Kept in sight when the table scrolls sideways; needs `width`. */
    pin?: 'left'
    /** In pixels: the column's width, fixed. */
    width?: number
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

/**
 * The features every data table registers: one page of rows, read by the server.
 *
 * Not under `components/ui/`, which is shadcn's to rewrite. TanStack Table v9
 * opts into features one by one: sorting, pagination, column visibility and
 * row selection are registered here, and sorting and pagination are *manual* — the rows
 * arrive sorted and cut by the server, and the table only says what to ask
 * for next. If something on `table` is missing, a feature was not registered.
 */
export const dataTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
})

/** The column helper a table's columns are built with, bound to the features above. */
export const columnHelperFor = <TData extends RowData>(): ColumnHelper<
  typeof dataTableFeatures,
  TData
> => createColumnHelper<typeof dataTableFeatures, TData>()

export type DataTableColumns<TData extends RowData> = ReturnType<
  ColumnHelper<typeof dataTableFeatures, TData>['columns']
>

/** What the table asks the address to change; `null` puts a parameter back to its default. */
export type DataTableChange = {
  page?: null | number
  perPage?: null | PageSize
  sort?: null | string
}

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown } as const

const toSorting = (sort: string): SortingState =>
  sort ? [{ desc: sort.startsWith('-'), id: sort.replace(/^-/, '') }] : []

const apply = <T,>(updater: Updater<T>, current: T): T =>
  typeof updater === 'function' ? (updater as (old: T) => T)(current) : updater

export type DataTableProps<TData extends { id: string }> = {
  /**
   * What can be done to several rows at once. Given, the rows get a checkbox,
   * and once some are ticked this is drawn over the table with their ids and
   * a way to untick them all.
   */
  bulkActions?: (ids: string[], clear: () => void) => ReactNode
  /** For screen readers: what the table lists. */
  caption: string
  columns: DataTableColumns<TData>
  data: TData[]
  /** What to say when no row matches. */
  empty: string
  /** A short note at the foot of the box, under the rows: what the list means. */
  footer?: ReactNode
  /** Columns hidden until the reader shows them. */
  hidden?: string[]
  onChange: (change: DataTableChange) => void
  /**
   * What opening a row does — a click on it, or Enter on the row the keyboard
   * is on (`j` and `k` move it). Clicks on the row's own buttons and links
   * stay theirs.
   */
  onOpenRow?: (row: TData) => void
  /** The row shown open elsewhere, marked as such. */
  openRowId?: null | string
  page: number
  /** A new page is on its way: the current one dims. */
  pending: boolean
  perPage: PageSize
  /** The sort in force, as the address holds it: `label`, `-label`. */
  sort: string
  /** Every row matching, all pages together. */
  total: number
  /** The filters, left of the column picker. */
  toolbar?: ReactNode
  /** Classes for a row of its own: a row with less to say, muted. */
  rowClassName?: (row: TData) => string | undefined
}

/** Cell padding, by density: the rows a screen holds. */
const DENSITY_CLASSES: Record<Density, string> = {
  comfortable: '[&_td]:py-2.5',
  compact: '[&_td]:py-1.5',
}

/** Cells 16px apart, and 16px from the box's edges. */
const CELL_CLASSES =
  '[&_td]:px-2 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th]:px-2 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4'

/** What a click on a row must leave to the element it landed on. */
const INTERACTIVE = 'a, button, input, label, select, textarea, [role=checkbox], [role=combobox]'

/**
 * A server-paginated, server-sorted table over the shadcn primitives, with a
 * toolbar, a column picker and a pagination bar.
 *
 * `columns` must be stable across renders — built outside the component, or
 * memoised — or every render rebuilds the table.
 */
export function DataTable<TData extends { id: string }>({
  bulkActions,
  caption,
  columns,
  data,
  empty,
  footer,
  hidden = [],
  onChange,
  onOpenRow,
  openRowId,
  page,
  pending,
  perPage,
  rowClassName,
  sort,
  toolbar,
  total,
}: DataTableProps<TData>) {
  const [density, setDensity] = useDensity()
  // The row the keyboard is on, among this page's; none until `j` or `k`.
  const [cursor, setCursor] = useState<{ data: TData[]; index: number }>({ data, index: -1 })
  const cursorIndex = cursor.data === data ? cursor.index : -1
  const t = useTranslations('DataTable')
  const frame = useRef<HTMLDivElement>(null)
  useStickyHead(frame)
  const pagination = { pageIndex: page - 1, pageSize: perPage }
  const sorting = toSorting(sort)
  // The ticks belong to the rows they were made on: a new page starts with none.
  const [ticked, setTicked] = useState<{ data: TData[]; selection: RowSelectionState }>({
    data,
    selection: {},
  })
  const rowSelection = ticked.data === data ? ticked.selection : {}
  const selectable = bulkActions !== undefined

  const allColumns = useMemo(() => {
    if (!selectable) {
      return columns
    }

    const helper = columnHelperFor<TData>()

    return [
      helper.display({
        meta: { pin: 'left', width: 40 },
        cell: ({ row }) => (
          <Checkbox
            aria-label={t('selectRow')}
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          />
        ),
        enableHiding: false,
        enableSorting: false,
        header: ({ table: current }) => (
          <Checkbox
            aria-label={t('selectPage')}
            checked={
              current.getIsAllPageRowsSelected() ||
              (current.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(checked) => current.toggleAllPageRowsSelected(checked === true)}
          />
        ),
        id: 'select',
      }),
      ...columns,
    ] as DataTableColumns<TData>
  }, [columns, selectable, t])

  const table = useTable({
    columns: allColumns,
    data,
    enableRowSelection: selectable,
    features: dataTableFeatures,
    getRowId: (row) => row.id,
    initialState: { columnVisibility: Object.fromEntries(hidden.map((id) => [id, false])) },
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const next = apply(updater, pagination)

      onChange(
        next.pageSize === perPage
          ? { page: next.pageIndex + 1 }
          : { page: null, perPage: next.pageSize as PageSize },
      )
      // The next page is read from its first row: the page scrolls back to the
      // table's top when the reader had scrolled past it.
      if (frame.current && frame.current.getBoundingClientRect().top < 0) {
        frame.current.scrollIntoView({ block: 'start' })
      }
    },
    onSortingChange: (updater) => {
      const [next] = apply(updater, sorting)

      onChange({ page: null, sort: next ? `${next.desc ? '-' : ''}${next.id}` : null })
    },
    onRowSelectionChange: (updater) => setTicked({ data, selection: apply(updater, rowSelection) }),
    rowCount: total,
    state: { pagination, rowSelection, sorting },
  })

  const rows = table.getRowModel().rows
  const visible = table.getVisibleLeafColumns()
  const width = visible.length

  // Where each pinned column starts, and which is the last: it carries the edge.
  const offsets = new Map<string, number>()
  let edge: null | string = null

  visible.reduce((left, column) => {
    const { pin, width: columnWidth = 0 } = column.columnDef.meta ?? {}

    if (pin !== 'left') {
      return left
    }

    offsets.set(column.id, left)
    edge = column.id

    return left + columnWidth
  }, 0)

  const pinning = (id: string) => {
    const left = offsets.get(id)
    const columnWidth = visible.find((column) => column.id === id)?.columnDef.meta?.width

    return left === undefined
      ? undefined
      : {
          // The edge only once columns pass under it: a table at rest has no line there.
          className: cn(
            'sticky z-[1]',
            id === edge && 'group-data-[scrolled=true]/frame:shadow-[inset_-1px_0_0_var(--border)]',
          ),
          style: { left, maxWidth: columnWidth, minWidth: columnWidth, width: columnWidth },
        }
  }

  const open = (row: TData) => onOpenRow?.(row)
  const openOnClick = (event: MouseEvent<HTMLTableRowElement>, row: TData) => {
    if (!(event.target as HTMLElement).closest(INTERACTIVE)) {
      open(row)
    }
  }

  /*
   * The table, worked from the keyboard: `/` finds, the arrows or `j`/`k`
   * move from row to row, Enter opens. Only from the page or the table
   * itself — a menu, a filter or a sheet keeps its own keys — and while no
   * row is open beside the table. Each key takes the browser's default only
   * when it acts, so the arrows still scroll everywhere else.
   */
  const fromPage = (event: KeyboardEvent) => {
    const target = event.target

    return (
      !(target instanceof HTMLElement) ||
      target === document.body ||
      Boolean(frame.current?.contains(target))
    )
  }

  const move = (event: KeyboardEvent, step: -1 | 1) => {
    if (!onOpenRow || data.length === 0 || openRowId || !fromPage(event)) {
      return
    }

    event.preventDefault()

    const next = Math.min(Math.max(cursorIndex + step, 0), data.length - 1)

    setCursor({ data, index: next })
    frame.current?.querySelector(`[data-row-index="${next}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  useHotkeys(
    [
      {
        callback: (event) => {
          const search =
            frame.current?.parentElement?.querySelector<HTMLInputElement>('input[type=search]')

          if (search && fromPage(event)) {
            event.preventDefault()
            search.focus()
          }
        },
        // Typed with Shift on an AZERTY keyboard, which the matcher allows for a symbol.
        hotkey: '/',
      },
      { callback: (event) => move(event, 1), hotkey: 'ArrowDown' },
      { callback: (event) => move(event, 1), hotkey: 'J' },
      { callback: (event) => move(event, -1), hotkey: 'ArrowUp' },
      { callback: (event) => move(event, -1), hotkey: 'K' },
      {
        callback: (event) => {
          if (onOpenRow && cursorIndex >= 0 && !openRowId && fromPage(event)) {
            event.preventDefault()
            onOpenRow(data[cursorIndex])
          }
        },
        hotkey: 'Enter',
      },
    ],
    { conflictBehavior: 'allow', preventDefault: false, stopPropagation: false },
  )

  const selectedIDs = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const clear = () => setTicked({ data, selection: {} })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        <DataTableViewOptions density={density} onDensityChange={setDensity} table={table} />
      </div>

      {/*
        The page scrolls, not the table; its header stays in sight above the
        rows (`useStickyHead`). Only a table wider than the page scrolls, sideways,
        in its box. The box is shadcn's, styled from here.
      */}
      <div
        aria-busy={pending}
        className={cn(
          'group/frame overflow-hidden rounded-xl border bg-card transition-opacity',
          DENSITY_CLASSES[density],
          CELL_CLASSES,
          // The page scrolls, not the table: one scroll, whatever the number of
          // rows. A table wider than the page scrolls sideways in its box.
          '[&_[data-slot=table-container]]:min-h-48',
          pending && 'opacity-60',
        )}
        // Scrolling does not bubble, but it is captured on the way down. Said on
        // the element itself, so a scroll costs no render.
        onScrollCapture={(event) => {
          const target = event.target as HTMLElement

          if (target.dataset.slot === 'table-container' && frame.current) {
            frame.current.dataset.scrolled = String(target.scrollLeft > 0)
          }
        }}
        ref={frame}
      >
        {/* What is done to the ticked rows, on a muted band over them. */}
        {bulkActions && selectedIDs.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted px-4 py-2">
            <span className="min-w-0 flex-1 basis-40 font-medium tabular-nums">
              {t('selected', { count: selectedIDs.length })}
            </span>
            {bulkActions(selectedIDs, clear)}
            <Button aria-label={t('clearSelection')} onClick={clear} size="icon" variant="ghost">
              <X />
            </Button>
          </div>
        )}
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader className="relative z-10 bg-card shadow-[0_1px_0_var(--border)] [&_th[style]]:z-[2] [&_th[style]]:bg-card [&_tr]:border-b-0 [&_tr]:hover:bg-transparent">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const numeric = header.column.columnDef.meta?.numeric
                  const direction = header.column.getIsSorted()
                  const Icon = direction ? SORT_ICONS[direction] : ChevronsUpDown
                  const pinned = pinning(header.column.id)

                  return (
                    <TableHead
                      aria-sort={
                        direction ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className={cn(
                        'h-9 text-xs font-medium text-muted-foreground',
                        numeric && 'text-right',
                        pinned?.className,
                      )}
                      key={header.id}
                      style={pinned?.style}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          className={cn(
                            'group/sort -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 transition-colors hover:bg-muted hover:text-foreground',
                            direction && 'text-foreground',
                            numeric && 'flex-row-reverse',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          <table.FlexRender header={header} />
                          <Icon
                            aria-hidden
                            className={cn(
                              'size-3.5 transition-opacity',
                              direction ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-60',
                            )}
                          />
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
                {onOpenRow && <TableHead aria-hidden className="w-4" />}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  className="h-24 text-center whitespace-normal text-muted-foreground"
                  colSpan={width + (onOpenRow ? 1 : 0)}
                >
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  className={cn(
                    // Opaque on hover, like the pinned cells drawn over the others.
                    'group/row hover:bg-muted',
                    onOpenRow && 'cursor-pointer',
                    // The open row and the keyboard's, as the selected one is drawn.
                    (row.id === openRowId || index === cursorIndex) && 'bg-muted',
                    index === cursorIndex && 'outline-2 -outline-offset-2 outline-ring/50',
                    rowClassName?.(row.original),
                  )}
                  data-row-index={index}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  key={row.id}
                  onClick={onOpenRow ? (event) => openOnClick(event, row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const pinned = pinning(cell.column.id)

                    return (
                      <TableCell
                        className={cn(
                          cell.column.columnDef.meta?.numeric && 'text-right tabular-nums',
                          pinned && [
                            pinned.className,
                            // Opaque, so the columns scrolling under it do not show through.
                            'bg-card group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                            (row.id === openRowId || index === cursorIndex) && 'bg-muted',
                          ],
                        )}
                        key={cell.id}
                        style={pinned?.style}
                      >
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    )
                  })}
                  {/* A row that opens something ends on the chevron that says so. */}
                  {onOpenRow && (
                    <TableCell className="w-4">
                      <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {footer && (
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">{footer}</div>
        )}
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
