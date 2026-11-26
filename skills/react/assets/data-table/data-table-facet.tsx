'use client'

import { ChevronDown, Plus } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export type FacetOption<TValue extends string = string> = {
  /** How many rows hold this value, all filters aside; shown, and muted at none. */
  count?: number
  label: string
  value: TValue
}

/**
 * A filter on one column, several values at once: a button naming the column,
 * and a list to tick, searchable when it is long. What is ticked shows on the
 * button, as badges, or as a count past two. Given counts, each value says how
 * many rows hold it, so a value nothing holds yet reads as such rather than
 * as a filter that is broken.
 */
export function DataTableFacet<TValue extends string>({
  onChange,
  options,
  title,
  value,
}: {
  /** The ticked values, in the order the options list them; none clears the filter. */
  onChange: (value: TValue[]) => void
  options: FacetOption<TValue>[]
  title: string
  value: readonly TValue[]
}) {
  const t = useTranslations('DataTable')
  const format = useFormatter()
  const chosen = new Set<string>(value)
  const toggle = (option: TValue) =>
    onChange(
      options
        .map(({ value: candidate }) => candidate)
        .filter((candidate) =>
          candidate === option ? !chosen.has(candidate) : chosen.has(candidate),
        ),
    )

  return (
    <Popover>
      {/* A chip of its own, dashed until something is ticked: a filter, not a view. */}
      <PopoverTrigger asChild>
        <Button
          className={cn(
            'h-7 rounded-full px-2.5 text-[13px]',
            chosen.size === 0 && 'border-dashed text-muted-foreground hover:text-foreground',
          )}
          size="sm"
          variant="outline"
        >
          {chosen.size === 0 ? <Plus /> : <ChevronDown />}
          {title}
          {chosen.size > 0 && (
            <>
              <Separator className="mx-0.5 h-3.5" orientation="vertical" />
              {chosen.size > 2 ? (
                <Badge className="rounded-full px-1.5 font-normal" variant="secondary">
                  {t('chosen', { count: chosen.size })}
                </Badge>
              ) : (
                options
                  .filter((option) => chosen.has(option.value))
                  .map((option) => (
                    <Badge
                      className="max-w-32 truncate rounded-full px-1.5 font-normal"
                      key={option.value}
                      variant="secondary"
                    >
                      {option.label}
                    </Badge>
                  ))
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          {options.length > 8 && <CommandInput placeholder={title} />}
          <CommandList>
            <CommandEmpty>{t('noOption')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  data-checked={chosen.has(option.value)}
                  key={option.value}
                  onSelect={() => toggle(option.value)}
                  value={`${option.label} ${option.value}`}
                >
                  <span
                    className={cn(
                      'flex min-w-0 flex-1 items-center justify-between gap-3',
                      option.count === 0 && !chosen.has(option.value) && 'text-muted-foreground',
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.count !== undefined && (
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {format.number(option.count)}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {chosen.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem className="justify-center" onSelect={() => onChange([])}>
                    {t('clearFilter')}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
