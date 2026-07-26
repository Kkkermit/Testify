# CI, Static Site, and Repo Assets

---

## `.github/workflows/run-tests.yml`

Triggers on push/PR to `main`/`master` **and a nightly cron**.
Steps: `actions/checkout@v3` → `actions/setup-node@v3` (Node 18, npm cache) → `npm ci` → `npm run test`.

| Issue | Detail |
|---|---|
| **No lint, no typecheck, no build** | Prettier is configured but **nothing runs it**, which is why three quote styles and 171 missing trailing newlines survive. |
| **Node 18** | Contradicts `.nvmrc` (21.7.1) and the README (18.13.0+). **Three different answers.** |
| **Actions a major behind** | `@v3` here, `@v4` in the other workflow. |
| **`npm ci` triggers `postinstall`** | So `src/scripts/postInstallation.js` prints its stale install guide on **every CI run**. |
| **Nightly cron tests nothing new** | Same code, same deps (`npm ci` respects the lockfile). |
| **No coverage upload, no `npm audit`** | |

## `.github/workflows/deploy-docs.yml`

Path-filtered on `site/**`. Uses `@v4` actions throughout. The `build` job has **no build step** — it uploads
`site/` verbatim to GitHub Pages.

## `.github/FUNDING.yml`

`buy_me_a_coffee: kkermit`.

---

## `site/` — the public docs site

Deployed to **testify.lol** (`site/CNAME`).

| File | Lines | Contents |
|---|---:|---|
| `index.html` | 1,139 | Tailwind CDN + Animate.css. Sections: overview, features, compatibility, installation, usage, slash commands, prefix commands, audit logs, technical, environment, support |
| `css/styles.css` | 1,174 | |
| `js/main.js` | 460 | Sidebar toggle, scroll-spy, smooth scroll, copy-to-clipboard, back-to-top, theme toggle, and **two live GitHub API `fetch` calls** for repo stats and contributors, both `.then()`-chained |

**The core problem: every command table is hand-written HTML.** It is not generated from `command.data`, so it
drifts from `src/commands/` immediately — and it already has. The site documents commands by category using the
same free-form `category` strings that 9 command files disagree with.

**Rewrite action:** generate the command tables from the command registry at build time. A small script that
imports the registry and emits markdown or HTML makes drift impossible, and it is the natural payoff of having
a typed `SharedCommand` contract with a `Category` enum.

---

## Root configuration files

| File | Notes |
|---|---|
| `.nvmrc` | `21.7.1` — disagrees with CI (18) and the README (18.13.0+) |
| `.npmrc` | `save-exact=true` — **directly contradicted** by `ytdlUpdater.js` running `npm install --save` at boot |
| `.prettierrc` | `useTabs`, `printWidth: 120`, `trailingComma: all`, `arrowParens: always`. Reasonable — but nothing enforces it |
| `.prettierignore` | 26 bytes |
| `babel.config.js` | Exists only for Jest; production runs raw Node |
| `jest.config.js` | See [`tests.md`](tests.md) |
| `.gitignore` | Correctly excludes `.env` and `logs/`. Note it excludes `/logs/evalLogs.txt` but the console logger writes an **unrotated, unbounded** `logs/console.log` |
| `.example.env` / `.development.example.env` | **The second is misnamed** — `bootMode.js` expects `.env.development` |
| `.DS_Store` | **Committed to the repository** — should be removed and gitignored |
| `package-lock.json` | 810 KB, inflated by dead heavyweight deps such as `puppeteer` |
| `CONTRIBUTING.md`, `credits.md`, `LICENSE` | MIT |

---

## README accuracy

Cross-checked against the code; three claims are wrong:

1. **"Music System: play music from YouTube, Spotify, and SoundCloud"** — true, but **prefix-only**. The slash
   surface has just `/radio` and `/tts`.
2. **The AI features are not built on `hercai`** despite it being a declared dependency — they use
   `apexify.js`, and `/ai` is **unreachable** behind `underDevelopment: true`.
3. **The "Setting up audit logs" section instructs users to hand-edit
   `node_modules/discord-logs/lib/index.js`.** This must be removed entirely — see
   [`scripts.md`](scripts.md#setuplogsjs--patches-node_modules).

Also stale: the Node version table, and `npm run start` referenced by the post-install script.

---

## Target CI

```yaml
- run: npm ci
- run: npm run typecheck
- run: npm run lint
- run: npm run format:check
- run: npm run test -- --coverage
- run: npm run build
- run: test -d dist/images && test -d dist/jsons    # assets must reach dist/
```

The asset check matters: a missing `dist/images` is **silent until runtime**, and ~330 PNGs plus a 200 KB JSON
database depend on the copy step. Full config in
[`../migration/12-TOOLING.md`](../migration/12-TOOLING.md#7-ci).
