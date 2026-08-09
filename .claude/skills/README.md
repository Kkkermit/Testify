# Skills

Design and frontend skills, **vendored** rather than installed, so they load for anybody working in this repo —
including the remote sessions on claude.ai/code, whose container is rebuilt from the repository every time and
where a `/plugin install` would not survive.

Each directory is a skill: a `SKILL.md` with `name` and `description` frontmatter, plus whatever references it
carries. `shared/` is not a skill — the accessibility ones read `../shared/methodology.md`.

## Where each came from

| Directory                        | Upstream                                     | Installs as             |
| -------------------------------- | -------------------------------------------- | ----------------------- |
| `frontend-design`                | `anthropics/skills`                          | skill directory         |
| `web-design-guidelines`          | `vercel-labs/agent-skills`                   | skill directory         |
| `react-best-practices`           | `vercel-labs/agent-skills`                   | skill directory         |
| `composition-patterns`           | `vercel-labs/agent-skills`                   | skill directory         |
| `uiux-*` (six)                   | `nextlevelbuilder/ui-ux-pro-max-skill`       | marketplace plugin      |
| `bencium-*`, `design-audit`, `typography` | `bencium/bencium-claude-code-design-skill` | marketplace plugin |
| `accessibility-*` (five), `shared` | `accesslint/claude-marketplace`            | marketplace plugin      |

Two of those repos are **not** plugin marketplaces despite looking like it — `vercel-labs/agent-skills` has no
`.claude-plugin/marketplace.json` at all, and `anthropics/skills` is a marketplace whose plugins are
`document-skills`, `example-skills` and `claude-api`, none of which contains `frontend-design`. Both were copied
from `skills/`, so `/plugin marketplace add` on either would have failed.

`ui-ux-pro-max` ships as one plugin containing six skills; they are lifted to the top level here with a `uiux-`
prefix so each is individually addressable. Its CLI source, screenshots, gallery and preview directories were
**not** vendored — 22 MB of build tooling and marketing assets that no skill reads. What is here is the payload
from `cli/assets/skills/`, which is what actually loads.

Three of the six (`uiux-banner-design`, `uiux-slides`, `uiux-brand`) are about social banners, HTML decks and
logo generation, which this repository has no use for. They are kept because skills are selected by description
and an irrelevant one simply never triggers — but do not read their presence as an endorsement of adding a
chart library or a slide generator here.

## Which of these decides a design question

**The skills lead the dashboard's visual direction.** That is a deliberate reversal: `dashboard.md` §18
documents the palette, type scale and spacing that exist today, and those are now a **baseline to rewrite
against** rather than a contract to defend. Where a skill's guidance and §18's current values disagree, the
skill wins and §18 gets updated to match what was built.

Three things do **not** move, because they are architecture rather than aesthetics:

- **Tokens stay the single source.** A rewrite may change every value in `@theme`; it may not start putting hex
  values in `.tsx`. The point of §18.1 is that one decision lives in one place, and that survives any restyle.
- **The accessibility floor stays a floor.** `jest-axe` runs on every page test, and the WCAG 2.2 target sizes
  and `sr-only`-not-`hidden` rules in §14 are not style opinions. The `accessibility-*` skills raise that floor;
  nothing lowers it.
- **The security boundary is untouchable.** No skill's advice justifies `dangerouslySetInnerHTML`, an inline
  script, or anything else the CSP in §9 exists to make inert.

## Updating them

There is no lockfile here. Re-clone the upstream repository and copy the directory over; the table above says
which repo and which path. They are in `.prettierignore` and ESLint's `ignores`, so an update is a clean diff
rather than a reformat.

## A note on the scripts

`uiux-*` carries Python and CommonJS scripts — a Gemini image generator, a Pexels background fetcher, a shadcn
installer. None runs on its own, none contains a key, and each reads credentials from the environment. Read one
before you run it, the same as any vendored script.
