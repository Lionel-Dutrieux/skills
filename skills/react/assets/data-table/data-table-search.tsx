'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

/**
 * The search box of a table, first in its toolbar and taking the room the
 * filters leave. `onChange` is the table's: it debounces the address.
 */
export function DataTableSearch({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  const t = useTranslations('DataTable')

  return (
    <InputGroup className="h-8 flex-1 basis-60 bg-background">
      <InputGroupInput
        aria-label={placeholder}
        // One clear button, ours: the browser's own is hidden.
        className="pl-2.5 [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value !== '' && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label={t('clearSearch')}
            onClick={() => onChange('')}
            size="icon-xs"
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
