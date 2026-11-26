'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

/** Drops the search and every filter; drawn only while one is set. */
export function DataTableReset({ onClick }: { onClick: () => void }) {
  const t = useTranslations('DataTable')

  return (
    <Button className="text-muted-foreground" onClick={onClick} size="sm" variant="ghost">
      {t('reset')}
      <X />
    </Button>
  )
}
