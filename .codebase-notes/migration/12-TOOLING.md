# 12 — Tooling

Build, type-check, lint, test and CI configuration for the TypeScript rewrite.

Current state: `typescript@5.7.3` is a devDependency, there is **no `tsconfig.json`**, **no lint step in CI**,
and Prettier is configured but nothing runs it.

---

## 1. `package.json`

```jsonc
{
  "name": "testify",
  "version": "2.0.0",
  "type": "module",
  "engines": { "node": ">=22.0.0" },     // does not exist today — three sources disagree on the version
  "main": "dist/index.js",
  "scripts": {
    "dev":        "tsx watch src/index.ts",
    "build":      "tsup",
    "start":      "node dist/index.js",
    "typecheck":  "tsc --noEmit",
    "lint":       "eslint .",
    "lint:fix":   "eslint . --fix",
    "format":     "prettier --write .",
    "format:check":"prettier --check .",
    "test":       "vitest run",
    "test:watch": "vitest",
    "test:coverage":"vitest run --coverage",
    "check":      "npm run typecheck && npm run lint && npm run format:check && npm run test",
    "db:wipe":    "tsx scripts/wipeDatabase.ts",
    "env:setup":  "tsx scripts/setupEnv.ts"
  }
}
```

**Removed deliberately:**
- `postinstall` — it printed a stale guide and ran on every CI `npm ci`
- `update-ytdl-core` from the boot path — `npm install` must not run at runtime (finding 40)
- `log-setup` — the `node_modules` patch is deleted entirely (finding 88)
- `update-packages` — unbounded `npm install` loops belong to a human, not a script

Align `.nvmrc` to `22`, and the CI workflow's `node-version` to `22`. Today `.nvmrc` says 21.7.1, CI says 18,
and the README says 18.13.0+.

---

## 2. `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,

    "esModuleInterop": true,
    "resolveJsonModule": true,          // required — src/jsons/*.json is imported directly
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,               // several deps ship broken types; do not let them block your build
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "declaration": false,

    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@core/*": ["src/core/*"],
      "@config/*": ["src/config/*"],
      "@db/*": ["src/database/*"],
      "@features/*": ["src/features/*"],
      "@ui/*": ["src/ui/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

`noUnusedLocals` will immediately flag the 11 unused imports catalogued in `04-AUDIT-FINDINGS.md`.
`resolveJsonModule` is not optional — the 200 KB perk database and the profanity list are imported as JSON.

> **Path aliases need runtime support.** `tsc` rewrites types but not emitted specifiers. tsup resolves them at
> build time, which is why it is preferred here over plain `tsc` for the build.

---

## 3. Build — tsup

```ts
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  splitting: false,
  bundle: false,        // keep the file tree — the loader globs real files at runtime
  publicDir: 'assets',  // ← copies assets/images (~330 PNGs) and assets/jsons into dist/
});
```

**`bundle: false` is deliberate.** The loader discovers command and event modules by globbing the filesystem;
bundling into one file would break that. If you later want a bundle, the loader must switch to a generated
manifest — decide that up front, not halfway through.

**`publicDir` is the asset-copy step.** Without it, `src/images/` (~330 PNGs) and `src/jsons/` (a 200 KB perk
DB plus the profanity list) never reach `dist/` and every image feature breaks at runtime with a path error
that looks nothing like the real cause. Verify this in Phase 1.

---

## 4. ESLint flat config

```ts
// eslint.config.ts
import js from '@eslint/js';
import ts from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { import: importPlugin },
    rules: {
      // Rules chosen for THIS codebase's specific findings
      'eqeqeq': ['error', 'always'],                                  // 19 loose == sites
      'no-var': 'error',                                              // 5 var declarations
      'import/no-extraneous-dependencies': 'error',                   // the 6 undeclared deps
      'import/no-cycle': 'error',                                     // processHandlers → index circular require
      '@typescript-eslint/no-floating-promises': 'error',             // the un-awaited execute() + un-awaited replies
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',         // `if (data.Roles.length < 0)`, `if (mongoose.connect)`
      'no-empty': ['error', { allowEmptyCatch: false }],              // the empty catches and empty if-bodies
      'no-case-declarations': 'error',                                // lotteryUtils.ts, valorantApi.ts
      'no-unreachable': 'error',                                      // `break` after `return`
      'no-console': ['error', { allow: [] }],                         // 298 console.* calls → the logger
      'no-restricted-syntax': ['error', {
        selector: "Property[key.name='ephemeral']",
        message: 'Use flags: MessageFlags.Ephemeral, or ctx.reply({ ephemeral: true }).',
      }],
    },
  },
  { files: ['scripts/**/*.ts'], rules: { 'no-console': 'off' } },
);
```

`no-floating-promises` alone would have caught findings 19 (the un-awaited prefix `execute`) and the
un-awaited replies in the DM/under-development checks.

---

## 5. Prettier

Keep the existing `.prettierrc` — it is already reasonable — and add the setting that fixes finding 93:

```jsonc
{
  "useTabs": true,
  "printWidth": 120,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertPragma": false
}
```

**171 of 321 files currently have no trailing newline.** Prettier fixes this on the first `npm run format`.
Add an `.editorconfig` with `insert_final_newline = true` so editors agree.

---

## 6. Testing — Vitest

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/index.ts'],
      thresholds: { lines: 40, functions: 40, branches: 30 },   // start achievable, ratchet up
    },
  },
});
```

**Why replace jest+babel:** the current setup transpiles TS-less JS through babel purely for Jest, and
`transformIgnorePatterns` excludes `node_modules` while several dependencies are ESM-only — a known future
breakage. Vitest runs ESM and TypeScript natively with no transform layer.

The coverage thresholds are set low **on purpose**. Today's config sets none and excludes most of the codebase
via `coveragePathIgnorePatterns`, so the number never looks bad. Start honest and ratchet.

`CommandContext` (see `11-TYPED-CONTRACTS.md`) is what makes this tractable — testing a command no longer
requires faking a full `Interaction`:

```ts
const ctx = createMockContext({ options: { user: mockUser }, guild: mockGuild });
await balanceCommand.execute(ctx);
expect(ctx.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
```

---

## 7. CI

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test -- --coverage
      - run: npm run build
      - name: Verify assets reached dist/
        run: test -d dist/images && test -d dist/jsons
```

Changes from the current workflow:
- `actions/checkout@v3` → `@v4`, `setup-node@v3` → `@v4` (the other workflow already uses v4)
- Node 18 → 22
- **Adds typecheck, lint, format and build** — none of which exist today
- **Adds the asset verification step**, because a missing `dist/images` is silent until runtime
- Drops the nightly cron (it tested nothing that a push does not) and the implicit `postinstall` run

---

## 8. Dependency changes

**Add:** `tsup`, `tsx`, `typescript-eslint`, `@eslint/js`, `eslint-plugin-import`, `vitest`,
`@vitest/coverage-v8`, `vite-tsconfig-paths`, `zod` (env + API boundary validation), `glob`, `pino` +
`pino-pretty` (the single logger), `@types/node`.

**Remove:** `hercai`, `puppeteer`, `sharp`, `captcha-canvas`, `yt-search`, `inquirer`, `cors`, `@types/cors`,
`uninstall`, `fs`, `os`, `ytdl-core`, `canvas`, `apexify.js`, `moment`, `@babel/*`, `babel-jest`, `jest`,
`cross-env` (native `NODE_ENV=` works fine on Node 22), `axios` (global `fetch`), `node-fetch`, `superagent`.

**Declare properly:** `ms` (or replace with a small typed parser), `@iamtraction/google-translate`.
Import `REST` and `Routes` from `discord.js` rather than `@discordjs/rest` / `discord-api-types`.

**Upgrade:** `mongoose` 6 → 8, `discord.js` → latest v14, `express` 4 → 5 (aligning with the already-declared
`@types/express` v5, which currently mismatches).

See `05-DEPENDENCIES.md` for the evidence behind each removal.
