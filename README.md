# Skills

Skills d'agent (Claude Code, Codex, Cursor…) partagés par l'équipe **keyes-dxp**.

Un skill = un dossier sous `skills/` contenant un `SKILL.md` avec un frontmatter YAML
(`name`, `description`). L'agent charge la description en permanence, et le corps du skill
uniquement quand la tâche correspond.

## Skills disponibles

| Skill | Description |
|---|---|
| [`keyes-dxp-nextjs`](skills/keyes-dxp-nextjs/SKILL.md) | Stack React/Next.js standardisée de l'équipe : quelle librairie pour quel besoin, règles server actions, auth, Drizzle, tests, pièges de version. |
| [`keyes-dxp-dotnet-react`](skills/keyes-dxp-dotnet-react/SKILL.md) | Stack ASP.NET Core (.NET 10) + SPA React (Vite) : tableau de décision des deux côtés (minimal APIs, EF Core 10, Hangfire, Microsoft.Identity.Web côté serveur ; TanStack + shadcn côté client), client API généré par orval depuis le contrat OpenAPI. |

## Installation

### En plugin Claude Code (recommandé)

Le repo est sa propre marketplace : les deux skills arrivent ensemble, et
`claude plugin update` les garde à jour.

```bash
claude plugin marketplace add Lionel-Dutrieux/skills
claude plugin install keyes-dxp-skills@keyes-dxp
```

Depuis une session, `/plugin` fait la même chose de façon interactive.

### Via le CLI `skills` (agent au choix)

Pour Codex, Cursor ou une copie éditable dans le projet, le CLI
[`skills`](https://github.com/vercel-labs/skills) :

```bash
# dans un projet, pour l'agent détecté automatiquement
npx skills add Lionel-Dutrieux/skills --skill keyes-dxp-nextjs

# globalement (disponible dans tous tes projets)
npx skills add Lionel-Dutrieux/skills --skill keyes-dxp-nextjs --global

# pour un agent précis
npx skills add Lionel-Dutrieux/skills --skill keyes-dxp-nextjs --agent claude-code
```

Le repo est public : aucun accès git particulier n'est nécessaire pour l'installer.

### Mise à jour

```bash
claude plugin update keyes-dxp-skills   # installation par plugin
npx skills update                       # installation par le CLI skills
```

## Structure

```
.claude-plugin/
  plugin.json           # manifeste du plugin
  marketplace.json      # le repo est sa propre marketplace
skills/
  keyes-dxp-nextjs/
    SKILL.md              # tableau de décision + règles — chargé en premier
    references/
      version-gotchas.md  # APIs qui ont changé après le training des modèles
      new-project.md      # checklist de bootstrap
      server-actions.md   # next-safe-action, authActionClient
      data-fetching.md    # RSC, nuqs, TanStack Query, route handlers
      forms.md            # TanStack Form (createFormHook) + Zod
      ui-styling.md       # Tailwind v4, shadcn/ui, motion, charts
      auth-and-cms.md     # Better Auth vs PayloadCMS
      database.md         # Drizzle ORM
      testing.md          # Vitest + Playwright
  keyes-dxp-dotnet-react/
    SKILL.md              # tableau de décision + règles — chargé en premier
    references/
      api-contract.md     # orval, contrat OpenAPI, ProblemDetails, drift check
      backend.md          # minimal APIs, EF Core 10, Hangfire, Identity.Web, tests
      documentation.md    # site Fumadocs séparé, doc écrite vs dérivée du code
      forms.md            # TanStack Form (createFormHook) + Zod + erreurs ASP.NET
```

Le `SKILL.md` reste court et actionnable ; les fichiers `references/` ne sont lus par
l'agent que lorsqu'il en a besoin.

## Contribuer

Le but de ces skills est l'uniformité : **les mêmes packages dans toutes les
apps**. Une modification de la stack se discute avant d'être committée.

1. Une décision par ligne dans le tableau `Need → library`, avec la colonne « Do NOT use »
   remplie — c'est elle qui empêche l'agent d'improviser.
2. Le détail et les exemples de code vont dans `references/`, pas dans `SKILL.md`. Règle de
   découpage : ce dont **tous** les cas ont besoin reste dans `SKILL.md`, ce que seuls
   **certains** cas atteignent part dans `references/` derrière un pointeur.
3. Un pattern partagé par les deux skills (formulaires, shadcn/ui) se modifie **des deux
   côtés** : ils s'installent séparément, donc chacun doit rester autonome.
4. Toute API qui a changé récemment va dans `references/version-gotchas.md`.
5. Les exemples de code sont écrits pour la version réellement utilisée en production, pas
   pour la dernière version lue dans un blog.

## Licence

MIT — voir [LICENSE](LICENSE).
