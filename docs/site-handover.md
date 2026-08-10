# The `site/` handover

`site/` was a hand-written static documentation page served from GitHub Pages at **testify.lol**. It has been
deleted, and this file is the record of what it did so the parts worth keeping can be rebuilt as dashboard
routes.

> [!WARNING]
> **Most of its copy described the original JavaScript bot, not Testify v2.** It advertised a music system, a
> Valorant integration, Instagram notifications, Spotify tracking, a weather API and AI commands — none of which
> exist in this codebase. It also claimed "over 100 slash commands" across 20 categories, and Node 18.13.0 as the
> minimum. The real numbers are in [`commands.md`](commands.md) and `.nvmrc`. Treat the structure below as
> the useful part and re-derive every fact.

---

## What it was, technically

| Thing        | Value                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Entry point  | `site/index.html` — 1,139 lines, one page, anchor-navigated                       |
| Styles       | `site/css/styles.css` (1,174 lines) plus Tailwind from a CDN `<script>`           |
| Behaviour    | `site/js/main.js` (460 lines) — sidebar, scroll-spy, copy buttons, GitHub fetches |
| Domain       | `site/CNAME` → `testify.lol`                                                      |
| Deployment   | `.github/workflows/deploy-docs.yml`, on push to `main` touching `site/**`         |
| Dependencies | Tailwind CDN, Font Awesome 6.4.0, Animate.css 4.1.1 — all third-party, all remote |

Two things about it are worth not repeating. It pulled Tailwind, Font Awesome and Animate.css from three
different CDNs at runtime, so the page could not render offline and every visitor was disclosed to three third
parties. And the Tailwind config was inlined in a `<script>` tag, which the dashboard's CSP forbids outright.

## Its page structure

One page, ten anchored sections, with a sidebar that scroll-spied the active one.

| Anchor          | Heading                 | What it held                                                               |
| --------------- | ----------------------- | -------------------------------------------------------------------------- |
| `overview`      | Overview                | One-paragraph pitch, live repo stats, contributor avatars, a security note |
| `features`      | Features                | Five groups: moderation, entertainment, information, integrations, custom  |
| `compatibility` | Compatibility           | OS support table, Node version table                                       |
| `installation`  | Installation            | Prerequisites and project setup                                            |
| `usage`         | Usage                   | Getting started                                                            |
| `commands`      | Commands                | Slash and prefix command tables, by category                               |
| `audit-logs`    | Audit Logs Setup        | Instructions to hand-patch `node_modules/discord-logs`                     |
| `technical`     | Technical Features      | Logger, database, integrations, performance                                |
| `environment`   | Environment Setup       | Writing the `.env` file                                                    |
| `support`       | Support & Contributions | Discord invite, repo links, licence, star history, donations               |

### The three dynamic pieces

Everything else was static HTML. These fetched at runtime, unauthenticated:

- **Repo stats** — `GET https://api.github.com/repos/Kkkermit/Testify`, rendered as stars/forks/issues badges.
- **Contributors** — `GET https://api.github.com/repos/Kkkermit/Testify/contributors?per_page=10`, rendered as
  a row of linked avatars.
- **Star history** — an `<img>` from `api.star-history.com`, with a `<picture>` swapping light and dark.

All three are anonymous GitHub API calls, which are rate-limited to 60 requests per hour per IP. On a page with
any traffic they failed regularly, and the fallback was the literal text "Loading stats…" left on screen.

---

## What to rebuild, and what to drop

### Worth having in the dashboard

- **Installation and environment setup.** The dashboard already has a setup screen for a half-install
  (`SetupNeeded` on `/sign-in`), so this is the natural home for it. `.env.example` is the source of truth for
  the variable list — generate the page from it rather than restating it, or the two drift, which is exactly
  what happened here.
- **The command reference.** `/commands` already does this better than the static page ever did: it reads
  `GET /api/commands`, which reads the live registry, so it cannot go stale. The static tables listed twenty
  categories that no longer exist. **Do not port them.**
- **Compatibility.** One short table is genuinely useful for a self-hosted bot. Take the Node floor from
  `.nvmrc`, not from prose.
- **Support links.** Discord invite, repo, issues, licence. These belong in the sidebar footer or an About
  screen, not a page section.

### Drop

- **The audit-logs section.** It told people to hand-edit a file inside `node_modules`, which does not survive
  `npm ci` and was only ever needed by the old `discord-logs` dependency. This codebase has no such dependency
  and audit logging is configured at `/guilds/:id/audit-log`.
- **Every feature claim.** The features list is a description of a different bot.
- **The live GitHub stats and contributor avatars.** They are the reason the page needed network access to
  render, they broke under rate limits, and a self-hosted admin panel should not call a third party on load.
  Testify deliberately never phones home — the runtime tab says so in as many words, and adding this back to
  the dashboard would contradict it.

### If the public page is still wanted

The dashboard is behind a sign-in gate, so it cannot replace a public landing page on its own. Two routes are
already public and outside the gate — `/terms` and `/privacy` — so a public marketing or docs route is a
supported shape. The alternative is to point `testify.lol` at the repo's `README.md`.

Either way, `deploy-docs.yml` and `site/CNAME` are gone, so **the DNS record for `testify.lol` now points at
nothing.** Repointing it is a manual step outside this repository.
