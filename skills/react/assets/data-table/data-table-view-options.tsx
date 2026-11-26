'use client'

import type { ReactTable, RowData } from '@tanstack/react-table'
import { Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { dataTableFeatures } from './data-table'

/** How tightly rows are drawn: compact holds about twice as many on a screen. */
export const DENSITIES = ['compact', 'comfortable'] as const

export type Density = (typeof DENSITIES)[number]

const DENSITY_KEY = 'data-table-density'
const DENSITY_EVENT = 'data-table-density'
// Rows 10px from their content.
const DEFAULT_DENSITY: Density = 'comfortable'

const readDensity = (): Density => {
  try {
    const stored = window.localStorage.getItem(DENSITY_KEY)

    return DENSITIES.includes(stored as Density) ? (stored as Density) : DEFAULT_DENSITY
  } catch {
    // Storage refused (a private window, blocked site data): the default.
    return DEFAULT_DENSITY
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange)
  window.addEventListener(DENSITY_EVENT, onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(DENSITY_EVENT, onChange)
  }
}

/**
 * The reader's density, the same for every table and kept in this browser: a
 * preference, not data. The server draws the default, and the reader's own
 * once the page runs.
 */
export const useDensity = (): [Density, (density: Density) => void] => {
  const density = useSyncExternalStore(subscribe, readDensity, () => DEFAULT_DENSITY)

  const setDensity = (next: Density) => {
    try {
      window.localStorage.setItem(DENSITY_KEY, next)
    } catch {
      // Kept for this page only.
    }

    window.dispatchEvent(new Event(DENSITY_EVENT))
  }

  return [density, setDensity]
}

/**
 * The table's display: which columns show — a column whose header is not
 * plain text cannot be hidden — and how tightly its rows are drawn.
 */
export function DataTableViewOptions<TData extends RowData>({
  density,
  onDensityChange,
  table,
}: {
  density: Density
  onDensityChange: (density: Density) => void
  table: ReactTable<typeof dataTableFeatures, TData>
}) {
  const t = useTranslations('DataTable')
  const columns = table
    .getAllLeafColumns()
    .filter((column) => typeof column.columnDef.header === 'string' && column.getCanHide())

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Quiet, at the end of the toolbar: a preference, seldom changed. */}
        <Button
          aria-label={t('display')}
          className="ml-auto text-muted-foreground hover:text-foreground"
          size="icon"
          title={t('display')}
          variant="ghost"
        >
          <Settings2 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('density')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={(value) => onDensityChange(value as Density)}
          value={density}
        >
          {DENSITIES.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              onSelect={(event) => event.preventDefault()}
              value={value}
            >
              {t(`densities.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('shownColumns')}</DropdownMenuLabel>
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            checked={column.getIsVisible()}
            key={column.id}
            onCheckedChange={(visible) => column.toggleVisibility(visible)}
            // Stays open: one usually shows or hides several at once.
            onSelect={(event) => event.preventDefault()}
          >
            {column.columnDef.header as string}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
