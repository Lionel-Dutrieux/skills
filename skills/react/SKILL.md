---
name: react
description: React conventions for keyes-dxp apps. Use when writing a component, hook or form, managing client state, styling with Tailwind or shadcn/ui, or adding animation, icons, a table, a long list or drag and drop.
---

# keyes-dxp React

Load first: `typescript`. In a Next.js app, the `nextjs` skill decides where data comes
from; this one covers what renders it.

## Stack

| Need | Use |
|---|---|
| Styling | Tailwind CSS v4, tokens in the `@theme` block of the entry stylesheet |
| Components | shadcn/ui, in `src/components/ui/` |
| Class names | `cn` from the `cn` package (shadcn's; `lib/utils.ts` re-exports it) |
| Icons | lucide-react, sized with `className`; `aria-hidden` when decorative |
| Toasts | sonner, through shadcn's `Sonner`, for the outcome of an action |
| Dark mode | next-themes, as shadcn sets it up |
| Animation | CSS transitions and Tailwind's `animate-*` first; `motion` (from `motion/react`) for orchestration, layout or gestures; both honour `prefers-reduced-motion` |
| Forms | TanStack Form, through `useAppForm` → `references/forms.md` |
| Charts | shadcn charts (`ChartContainer` + a `ChartConfig`), not Recharts directly |
| Command palette | shadcn's `Command`, not `cmdk` directly |
| Rich text | Payload's `RichText` (`@payloadcms/richtext-lexical/react`) inside `prose` classes (`@tailwindcss/typography`) |
| Email templates | react-email |
| Chat UI | AI Elements (a shadcn registry), over the Vercel AI SDK |
| Tables | TanStack Table |
| Long lists | TanStack Virtual |
| Keyboard shortcuts | TanStack Hotkeys |
| Debounce, throttle | TanStack Pacer |
| Drag and drop | `@dnd-kit/react` |
| URL state | nuqs |
| Server data cached in the browser | TanStack Query, in the cases `nextjs` allows |
| UI state shared across the app | TanStack Store, rarely (see State) |

Adding, fixing or composing a shadcn component: the official `shadcn` skill.

## The design system

**A file in `src/components/ui/` is never edited.** The shadcn CLI owns it:
`pnpm dlx shadcn@latest add <name> --overwrite` re-fetches it, which is how fixes,
accessibility patches and new variants arrive. An edit made there is lost on the next
update, or freezes the component on an old version because nobody dares update it any
more. Lint and Prettier leave those files as the CLI writes them.

Customize from the top of this ladder and stop at the first step that works:

1. **Theme tokens** in `@theme`: colors, radius, fonts.
2. **Props at the call site**: the component's `variant` and `size`, and a `className`
   merged by `cn`.
3. **A wrapper** outside `ui/`, composing the primitive and adding defaults or `cva`
   variants.
4. **A fork** under a new name outside `ui/`, announced to the user.

## Components

- The file is named after the component, in kebab-case: `post-card.tsx` exports `PostCard`.
- React Compiler memoizes: write plain values and functions.
- Derive values during render. An effect only synchronizes with something outside React.
- Props carry what the component renders and nothing more: a DTO, never a raw document.
- `'use client'` goes on the smallest component that needs state, effects or browser APIs.
- Every UI string comes from the translation layer (`nextjs` skill).
- Every interactive element has an accessible name, which is also how tests find it.
- A validation error shows inline, on its field; a toast reports what an action did.

## Hooks

A feature's hook lives in the feature, as `lib/use-<name>.ts`. A hook shared across
features lives in `src/lib/hooks/`, where the shadcn CLI writes too (`aliases.hooks` in
`components.json`).

## State

Take the first that fits:

1. Data rendered by the server (`nextjs` skill).
2. The URL, through nuqs, for anything a link should restore: filters, tabs, pagination.
3. The TanStack Query cache, for server data the browser keeps fresh.
4. `useState`, in the component that owns the state.
5. A TanStack Store, for UI state that distant components share and that outlives a
   navigation, while belonging neither to the server nor to the URL.

A server-first app seldom reaches step 5. The cases that do: an upload queue that keeps
running while the user moves between pages, a player that keeps playing, a selection
gathered across several pages of a list for a bulk action. The store lives in the
feature's `lib/`, is read with `useSelector` in Client Components, and holds neither
server data nor form state.

```ts
// features/drive/lib/upload-queue.ts
export const uploadQueue = createStore({ uploads: [] as Upload[] }, ({ setState }) => ({
  add: (upload: Upload) => setState((state) => ({ uploads: [...state.uploads, upload] })),
  remove: (id: string) =>
    setState((state) => ({ uploads: state.uploads.filter((upload) => upload.id !== id) })),
}))

// in a Client Component
const uploads = useSelector(uploadQueue, (state) => state.uploads)
uploadQueue.actions.remove(id)
```

## References

| File | Read it when |
|---|---|
| `references/forms.md` | Building a form or a field type, or showing a submission error |

The ESLint layer is `assets/eslint-react.mjs`, synced as `typescript`'s
`references/config.md` describes.
