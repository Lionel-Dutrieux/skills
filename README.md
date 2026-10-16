# Skills

Skills d'agent partagés par l'équipe **keyes-dxp** : nos choix de stack, nos configs, notre
nomenclature et notre structure de dossiers pour les apps TypeScript, React, Next.js et
Payload.

Un skill = un dossier sous `skills/` contenant un `SKILL.md` avec un frontmatter YAML
(`name`, `description`). L'agent garde la description en contexte en permanence, lit le
corps quand la tâche correspond, et n'ouvre un fichier de `references/` que lorsqu'un
pointeur l'y envoie.

## Skills

| Skill | Couvre | Charge aussi |
|---|---|---|
| [`typescript`](skills/typescript/SKILL.md) | Le socle : stack, config ESLint/Prettier/tsconfig, nommage, erreurs, Zod aux frontières, logs, dates, tests, monorepo | — |
| [`react`](skills/react/SKILL.md) | Composants, design system shadcn, formulaires TanStack Form, état | `typescript` |
| [`nextjs`](skills/nextjs/SKILL.md) | App Router : structure de `src/`, DAL, server actions, listes SSR, cache, env, i18n, observabilité | `react` |
| [`payload`](skills/payload/SKILL.md) | Payload : base de données, territoire et nommage, migrations, nos plugins, écriture de plugins | `typescript` |

**Les paquets à utiliser** sont dans le tableau `Stack` en tête de chaque `SKILL.md`, du
socle vers le framework : [`typescript`](skills/typescript/SKILL.md#stack) (outillage,
validation, logs, dates, tests), [`react`](skills/react/SKILL.md#stack) (UI, formulaires,
état), [`nextjs`](skills/nextjs/SKILL.md#stack) (actions, env, i18n, tracing, headless). Nos
plugins Payload sont dans [`payload`](skills/payload/SKILL.md#our-plugins). Chaque paquet
n'apparaît que dans un tableau.

Les skills se citent entre eux et renvoient aux skills officiels quand ceux-ci prennent le
relais. Ces derniers s'installent par projet, pour suivre la version du framework :

| Skill officiel | Source |
|---|---|
| `payload` | `npx skills add payloadcms/skills --skill payload` |
| `shadcn` | `npx skills add shadcn-ui/ui --skill shadcn` |
| `next-dev-loop`, `next-cache-components-adoption`, `next-bundle-optimizer` | `npx skills add vercel/next.js` |

## Installation

Le repo est sa propre marketplace. Les skills s'installent ensemble : ils se référencent
entre eux, un skill seul serait incomplet.

```bash
claude plugin marketplace add Lionel-Dutrieux/skills
claude plugin install keyes-dxp@keyes-dxp
```

Mise à jour : `claude plugin update keyes-dxp`. Depuis une session, `/plugin` fait la même
chose de façon interactive.

## Les configs

ESLint, Prettier, tsconfig, Vitest et Playwright vivent dans les `assets/` des skills, seule
source de vérité. Un projet en garde une copie dans `.config/keyes-dxp/`, que l'agent
installe ou resynchronise quand on le lui demande (« synchronise la config keyes-dxp »),
selon [`typescript/references/config.md`](skills/typescript/references/config.md). Une règle
se change dans le skill, jamais dans la copie.

## Structure

```
.claude-plugin/
  plugin.json         # manifeste du plugin
  marketplace.json    # le repo est sa propre marketplace
skills/
  <skill>/
    SKILL.md          # ce dont toutes les tâches du skill ont besoin
    references/       # ce dont seules certaines tâches ont besoin, lu via un pointeur
    assets/           # la couche de config du skill, copiée dans les projets
```

## Contribuer

1. **Un skill ne contient que ce que le modèle ne peut pas deviner** : nos choix, nos
   conventions, nos pièges. L'API des frameworks reste dans leur doc et leurs skills
   officiels.
2. **Les conventions officielles d'abord.** Quand Next.js, Payload ou shadcn en ont une, on
   la suit ; on ne tranche que là où ils n'en ont pas.
3. **Ce qu'un outil peut vérifier va dans l'outil** (lint, tsconfig, `server-only`), pas
   dans la prose.
4. **Chaque sens à un seul endroit.** Un sujet partagé vit dans un skill, les autres y
   renvoient.
5. **Formuler la cible, pas l'interdit.** Une interdiction n'apparaît que là où le réflexe du
   modèle est faux, toujours avec l'alternative.
6. **Rester court** : un `SKILL.md` autour de 100 lignes, une référence autour de 60, un seul
   exemple par pattern.
7. **Vérifier avant de committer** : une config ou un extrait de code modifié passe lint,
   tsc et build sur un projet jetable.

## Licence

MIT — voir [LICENSE](LICENSE).
