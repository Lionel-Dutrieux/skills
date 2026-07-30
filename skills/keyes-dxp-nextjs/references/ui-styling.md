# UI and styling

## Tailwind CSS v4

CSS-first configuration. There is no `tailwind.config.js` — do not create one, do not look
for one.

```css
/* app/globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --color-brand-500: oklch(0.62 0.19 258);
  --font-display: "Inter", sans-serif;
}
```

Tokens defined in `@theme` become utilities automatically (`bg-brand-500`, `font-display`).
Design tokens live there, not in a JS object.

No CSS modules, no Sass, no styled-components. If a utility string gets unmanageable, that
is a signal to extract a component — not to write custom CSS.

## shadcn/ui

```bash
pnpm dlx shadcn@latest init                 # once, at project setup
pnpm dlx shadcn@latest add button dialog form table
```

- Generated files land in `components/ui/` and **are yours to edit**. Customize there.
- Never hand-write a component that shadcn/ui provides. If you need a variant, extend the
  generated file's `cva` variants rather than forking it.
- Project components go in `components/`, feature components next to their feature. Only
  shadcn primitives live in `components/ui/`.

## cn()

Ships with shadcn/ui in `lib/utils.ts`. Use it for every conditional or merged class list —
it resolves Tailwind conflicts, which plain string concatenation cannot.

```tsx
import { cn } from "@/lib/utils"

<div className={cn("rounded-md p-4", isActive && "bg-accent", className)} />
```

Always accept and forward a `className` prop on reusable components, merged last so the
caller wins.

## Theming and dark mode

`next-themes` is installed by shadcn/ui's setup — follow its dark mode guide rather than
inventing a provider. Style dark variants with the `dark:` modifier and the semantic
shadcn tokens (`bg-background`, `text-muted-foreground`, `border-border`) instead of
hardcoded colors, so themes stay consistent for free.

## Icons

`lucide-react` only. Import individual icons; keep sizing on the className.

```tsx
import { ChevronRight } from "lucide-react"

<ChevronRight className="size-4" aria-hidden />
```

Decorative icons get `aria-hidden`. Icon-only buttons get an accessible name
(`<span className="sr-only">`).

## Toasts

`sonner`, through shadcn/ui's `Sonner` component. Mount `<Toaster />` once in the root
layout, then `toast.success(...)` / `toast.error(...)` anywhere. Toasts report the outcome
of an action — not validation errors, which belong inline on the field.

## Command palette

shadcn/ui's `Command` component (which wraps `cmdk`). Never import `cmdk` directly.

## Charts

```bash
pnpm dlx shadcn@latest add chart
```

Build charts from the generated `ChartContainer` / `ChartTooltip` / `ChartLegend` wrappers
with a `ChartConfig` object. Do not import Recharts directly, and do not add Chart.js,
nivo or victory. If the shadcn wrapper genuinely cannot express the chart, say so
explicitly before reaching for a primitive.

## Animation

`motion`, imported from `motion/react`:

```tsx
import { motion } from "motion/react"

<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
```

Prefer CSS transitions and Tailwind's `animate-*` utilities for simple hover/enter states;
reach for `motion` when you need orchestration, layout animation or gestures. Respect
`prefers-reduced-motion`.

## Rich text

Render CMS/markdown output inside `@tailwindcss/typography`'s `prose` classes
(`prose dark:prose-invert max-w-none`). Do not restyle headings and lists by hand.

## Tables, virtualization, drag & drop, shortcuts

- **Tables** → TanStack Table for the logic, shadcn/ui `Table` for the markup. Never
  hand-roll sorting, filtering or pagination.
- **Long lists** → TanStack Virtual once a list can realistically exceed a few hundred rows.
- **Drag & drop** → `@dnd-kit`, with keyboard sensors enabled for accessibility.
- **Shortcuts** → TanStack Hotkeys, scoped so they do not fire while typing in inputs.
- **Debounce / throttle** → TanStack Pacer, in every case, including search inputs.
