'use client'

import type { ReactTable, RowData } from '@tanstack/react-table'
import { useFormatter, useTranslations } from 'next-intl'
import { usePathname, useSearchParams } from 'next/navigation'
import type { MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import type { dataTableFeatures } from './data-table'
import { PAGE_SIZES } from './params'

/**
 * The pages to offer around `current`: the first, the last, and two either
 * side, with `null` where some are skipped — 1 … 4 5 6 7 8 … 20.
 */
export const pagesAround = (current: number, count: number): (null | number)[] => {
  const shown = [
    ...new Set([1, current - 2, current - 1, current, current + 1, current + 2, count]),
  ]
    .filter((page) => page >= 1 && page <= count)
    .sort((a, b) => a - b)

  return shown.flatMap((page, index) =>
    index > 0 && page - shown[index - 1] > 1 ? [null, page] : [page],
  )
}

/**
 * Which rows these are, rows per page, and the way to the others.
 *
 * The pages are links — `?page=3`, to open in a new tab or to share — which a
 * plain click follows through the table instead, so that the page changes
 * inside the table's transition.
 */
export function DataTablePagination<TData extends RowData>({
  table,
}: {
  table: ReactTable<typeof dataTableFeatures, TData>
}) {
  const t = useTranslations('DataTable')
  const format = useFormatter()
  const pathname = usePathname()
  const search = useSearchParams()
  const { pageIndex, pageSize } = table.state.pagination
  const total = table.getRowCount()
  const count = Math.max(table.getPageCount(), 1)
  const current = pageIndex + 1
  const first = total === 0 ? 0 : pageIndex * pageSize + 1
  const last = Math.min(current * pageSize, total)

  const hrefOf = (page: number) => {
    const next = new URLSearchParams(search)

    if (page === 1) {
      next.delete('page')
    } else {
      next.set('page', String(page))
    }

    const query = next.toString()

    return query ? `${pathname}?${query}` : pathname
  }

  const go = (page: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    // A new tab, or a new window: the browser's to open.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    table.setPageIndex(page - 1)
  }

  const canPrevious = table.getCanPreviousPage()
  const canNext = table.getCanNextPage()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground tabular-nums">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          {t('range', {
            first: format.number(first),
            last: format.number(last),
            total: format.number(total),
          })}
        </span>
        {/* Rows per page: a preference, kept quiet beside the range. */}
        <Select
          onValueChange={(value) => table.setPageSize(Number(value))}
          value={String(pageSize)}
        >
          <SelectTrigger
            aria-label={t('perPage')}
            className="border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted hover:text-foreground dark:bg-transparent"
            size="sm"
          >
            <SelectValue>{t('rowsPerPage', { count: pageSize })}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {t('rowsPerPage', { count: size })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {count > 1 && (
        <Pagination aria-label={t('pagination')} className="mx-0 w-auto">
          <PaginationContent className="gap-2">
            <PaginationItem>
              <Button
                aria-disabled={!canPrevious}
                asChild
                className="text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
                variant="outline"
              >
                <a
                  href={hrefOf(Math.max(current - 1, 1))}
                  onClick={go(Math.max(current - 1, 1))}
                  rel="prev"
                  tabIndex={canPrevious ? undefined : -1}
                >
                  {t('previous')}
                </a>
              </Button>
            </PaginationItem>
            {/* The pages around this one, to jump further than the next: on a wide screen only. */}
            {pagesAround(current, count).map((page, index) =>
              page === null ? (
                <PaginationItem className="hidden md:block" key={`gap-${index}`}>
                  <PaginationEllipsis className="size-8" />
                </PaginationItem>
              ) : (
                <PaginationItem className="hidden md:block" key={page}>
                  <Button
                    asChild
                    className={cn(page === current ? 'text-foreground' : 'text-muted-foreground')}
                    size="icon"
                    variant={page === current ? 'secondary' : 'ghost'}
                  >
                    <a
                      aria-current={page === current ? 'page' : undefined}
                      aria-label={t('goTo', { page })}
                      href={hrefOf(page)}
                      onClick={go(page)}
                    >
                      {format.number(page)}
                    </a>
                  </Button>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <Button
                aria-disabled={!canNext}
                asChild
                className="text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
                variant="outline"
              >
                <a
                  href={hrefOf(Math.min(current + 1, count))}
                  onClick={go(Math.min(current + 1, count))}
                  rel="next"
                  tabIndex={canNext ? undefined : -1}
                >
                  {t('next')}
                </a>
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
