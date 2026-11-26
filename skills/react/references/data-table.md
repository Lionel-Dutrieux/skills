# Data tables

Read this when a page shows rows in a table: paginated, sorted and filtered by the server.
Where the rows come from is `nextjs`'s `references/lists.md`.

## Install the table, do not write one

The table ships in `assets/data-table/`: TanStack Table, shadcn primitives, the state in the
URL through nuqs.

1. **Copy the folder with `cp`** to `src/components/data-table/`, outside `ui/`, and leave
   out `messages/`. From then on, the files are the project's.
2. **Merge `messages/<locale>.json`** into the project's messages: one `DataTable`
   namespace.
3. **Add the primitives**: `pnpm dlx shadcn@latest add badge button checkbox command
   dropdown-menu input-group pagination popover select separator table`.
4. **Install**: `pnpm add @tanstack/react-table@^9 @tanstack/react-hotkeys nuqs`.

## TanStack Table v9 is not v8

- The hook is `useTable`, not `useReactTable`. Each feature is registered in
  `tableFeatures`: `dataTableFeatures`, in `data-table.tsx`. A method missing on `table` is
  a feature not registered, not a typing problem.
- Columns come from `columnHelperFor<Row>()`, bound to those features, and keep their
  identity across renders: React Compiler gives it to them, `useMemo` without it.

## One table, three files in its feature

- `lib/search-params.ts`: `...dataTableParams(SORTS, 'name')`, the filters
  (`parseAsValues`, `parseAsIDs`) and `createLoader`.
- `data/<thing>.ts`: the DAL, answering a `Page<Row>`.
- `components/<feature>-table.tsx`: the columns and the toolbar.

```tsx
export function MembersTable({ page }: { page: Page<MemberRow> }) {
  const t = useTranslations('Members')
  const { onTableChange, params, pending, setParams, setSearch } = useDataTableQuery(memberParams)
  const filtered = params.q !== '' || params.status.length > 0

  return (
    <DataTable
      caption={t('caption')}
      columns={columns}
      data={page.rows}
      empty={filtered ? t('noMatch') : t('none')}
      onChange={onTableChange}
      page={params.page}
      pending={pending}
      perPage={params.perPage}
      sort={params.sort}
      toolbar={
        <>
          <DataTableSearch onChange={setSearch} placeholder={t('search')} value={params.q} />
          <DataTableFacet
            onChange={(status) => setParams({ page: null, status: status.length ? status : null })}
            options={MEMBER_STATUSES.map((value) => ({ label: t(`statuses.${value}`), value }))}
            title={t('status')}
            value={params.status}
          />
          {filtered && <DataTableReset onClick={() => setParams({ page: null, q: null, status: null })} />}
        </>
      }
      total={page.total}
    />
  )
}
```

- A filter writes `null` to clear itself and `page: null` to go back to the first page.
- A sortable column's id is a field the sort parser accepts; any other column says
  `enableSorting: false`.
- The rest is in the props' JSDoc: `hidden` columns, `bulkActions`, `onOpenRow` (a click,
  or `j`/`k` and Enter), `meta` (`numeric`, `pin`, `width`), `footer`, `rowClassName`.
