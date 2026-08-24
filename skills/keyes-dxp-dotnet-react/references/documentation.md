# Technical documentation

**Fumadocs, in its own Next.js project**, beside the solution — not inside the SPA, not inside
the WebApi. The SPA is Vite and has no server to render MDX; the docs site is Next.js and only
ever runs on a developer machine or a docs deployment.

Reference implementation: `Keyes-CSP` (`web/portal-docs/`).

## Layout

```
web/
  portal-spa/            # the Vite SPA
  portal-docs/           # the Fumadocs site — Next.js, its own package.json, port 3100
    content/docs/
      architecture/      # WRITTEN, committed
      reference/         # DERIVED, git-ignored
    lib/                 # source.ts, openapi.ts
    scripts/             # generate.mjs, generate-dotnet.mjs, generate-spa.mjs
scripts/docs.ps1         # repo-root entry point, with preflight checks
```

Packages: `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, plus `fumadocs-openapi` for the HTTP
reference and `typedoc` + `typedoc-plugin-markdown` for the SPA one.

## Four sections, two natures

This is the load-bearing idea. Get it wrong and the documentation rots.

| Section | Nature | Where a wrong sentence is fixed |
|---|---|---|
| `content/docs/architecture/` | **Written**, committed | in the MDX |
| `/docs/api` | derived from the OpenAPI contract | in the endpoint code |
| `/docs/reference/dotnet` | derived from the `///` XML comments | in the `.cs` comment |
| `/docs/reference/spa` | derived from the TSDoc blocks | in the `.ts` / `.tsx` comment |

**The derived sections are not committed** — `content/docs/reference/` is git-ignored, and the
HTTP reference never exists as a file at all. That is deliberate: it removes the option of
"fixing" a generated page. There is nowhere else to write it than the code it came from.

Corollary for any agent: **never edit a page under `reference/`**. It is regenerated on the
next build and your change disappears. Edit the comment.

## How each derived section is built

**HTTP reference** — `createOpenAPI` reads `artifacts/openapi/v1.json` and `staticSource` hands
Fumadocs' `loader()` **virtual** pages alongside the MDX ones: one page per operation, grouped
by tag, no file written. A route added on the .NET side appears as soon as the contract is
regenerated (`references/api-contract.md` — same contract as the orval client).

The "try this request" playground stays **disabled**: it would fire real requests at the API
from the browser, which assumes an Entra session and a CORS policy open to the docs site.

**.NET reference** — reads the XML documentation files the compiler writes for `src/*`
(`GenerateDocumentationFile` in `Directory.Build.props`), one MDX page per namespace. So the
quality of this section is exactly the quality of the `///` comments.

**SPA reference** — TypeDoc over the SPA sources, markdown output.

**One entry point**: `npm run generate` regenerates all three; `--if-missing` (what `dev` uses)
only fills the gaps, because paying for a full .NET build on every start buys nothing.

## Writing rules

- **English**, like the code and its comments. A client-facing plan written in French belongs
  under `docs/`, not in the docs site.
- **A concept is documented once**, and other pages link to it. Two half-explanations of the
  same mechanism is how a docs site starts lying.
- **No filler.** If something is trivially derivable from the code, the types or an obvious
  convention, it earns no page. The question is: *what must a developer know that they cannot
  deduce by reading the code?*
- `meta.json` **orders and filters** the sidebar — a file absent from `pages[]` is invisible
  though it still builds, and a new sub-folder must be added to its parent's `pages[]`.
- Adding a page means adding MDX. It never means touching the Next.js route.

## When the docs are wrong

A change that makes the architecture pages false is not finished. Treat those pages the way
`Keyes-CSP` treats them: they describe the system **as it is today**, so when the code and the
page disagree, it is the page that is wrong — and updating it is part of the same change, not a
follow-up.
