# Technical documentation

Fumadocs, inside the Next.js app: pages are MDX under `content/docs/`, served by a
`(fumadocs)` route group. Adding a page means adding MDX; the route stays as it is.

- **`meta.json` orders and filters the sidebar.** A page missing from its folder's
  `pages[]` builds but stays invisible, and a new sub-folder goes into its parent's
  `pages[]` too.
- **A concept is documented once**, and other pages link to it. Two half-explanations of
  the same mechanism are how a docs site starts lying.
- **A page answers what the code cannot.** What is derivable from the code, the types or an
  obvious convention earns no page; the question is what a developer must know that reading
  the code will not tell them.
- **A page generated from the code** (an API reference from the OpenAPI document) is fixed
  in the code it comes from, never in the generated page.
- Pages are in English, like the code.

If the repo ships its own docs-writing skill, it wins over this file.
