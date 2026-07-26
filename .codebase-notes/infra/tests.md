# `src/__tests__/` — Test Suite

**12 files · 1,647 lines.** Jest + babel.

---

## Structure

```
__tests__/
  setup.js                  setupFilesAfterEach
  utils/testUtils.js        setupTest / teardownTest + re-exported discord.js enums
  fixtures/economyMocks.js  createEconomyUserMock, createTimeoutMock, createCommandWithMockTimeout
  mocks/emptyMock.js        DEAD — nothing references it
  Community/                impersonate · meme · minecraft · translate · wiki
  Counting/                 counting
  Devs/                     bugReport · suggestion
```

---

## Coverage reality

**8 command test files against ~170 commands** (103 slash + 67 prefix).

**Zero tests** for `functions/`, `utils/`, `lib/`, `api/`, `schemas/`, `events/`, `client/`, `jobs/`,
`server/` — i.e. the entire loader layer, the dispatch core, all 32 models, and every external integration.

`jest.config.js` sets `collectCoverageFrom: ['src/commands/**/*.js']` and then
`coveragePathIgnorePatterns` excludes `scripts`, `schemas`, `events`, `functions`, `config.js` and `index.js`.
**The reported coverage number therefore never looks bad, because most of the codebase is excluded from the
denominator.** **Finding 95.**

---

## Configuration issues

| File | Issue |
|---|---|
| `jest.config.js` | `transformIgnorePatterns` includes `/node_modules/` while several dependencies are **ESM-only** — a known future breakage. |
| `babel.config.js` | `@babel/preset-env` + class-properties + commonjs transform. **Used only by Jest** — production runs raw Node, so tests and production execute differently transformed code. |
| `setup.js` | Sets `NODE_ENV=test`, stubs 6 env vars, **freezes `Date.now()`**, replaces `global.console`, `jest.setTimeout(10000)`. |
| `setup.js` | **Sets `process.env.clientId` (camelCase) while the code reads `process.env.clientid` (lowercase).** The stub is ineffective. **Finding 3.1.** |
| `utils/testUtils.js` | Calls `jest.useFakeTimers()` + `setSystemTime(...)`, **conflicting with `setup.js`'s `Date.now` mock** — two different frozen clocks. |
| `utils/testUtils.js` | The mock `client.config` is a **hand-maintained 6-key subset of the real ~110-key config** that drifts; individual tests patch in more keys ad hoc. |
| `mocks/emptyMock.js` | **Dead** — there is no `moduleNameMapper`, and no test references it. |
| `Community/translate.test.js` | Mocks `@iamtraction/google-translate`, which is **not in `package.json`**. **Finding 13.** |
| `Community/minecraft.test.js` | Stubs `global.fetch` by hand while `meme.test.js` uses `jest.mock('axios')` — inconsistent approaches in the same suite. |
| `Devs/*.test.js` | `jest.mock('discord.js')` wholesale. |
| `Counting/counting.test.js` | Mocks the schema with an inline factory referencing an outer variable — a Jest hoisting hazard that works only because it is used lazily. |

---

## Why the tests are hard to write today

Testing a command means constructing a fake `Interaction` with `options`, `reply`, `editReply`, `deferReply`,
`followUp`, `guild`, `member`, `user` and `client`, plus a fake `client.config`. That is why there are only
eight of them.

**`CommandContext` is the fix.** Once command logic depends on a small context interface rather than a
discord.js `Interaction`, a test becomes:

```ts
const ctx = createMockContext({ options: { amount: 100 }, guild: mockGuild });
await depositCommand.execute(ctx);
expect(ctx.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
```

See [`../migration/11-TYPED-CONTRACTS.md`](../migration/11-TYPED-CONTRACTS.md#3-commandcontext--the-surface-abstraction).

---

## Rewrite target

Move to **Vitest** (native ESM + TypeScript, no babel layer) at `tests/`, mirroring `src/features/`.

**Priority order** — the inverse of today's coverage:

1. `core/` — loader, router, custom-ID codec, middleware, error boundary
2. `database/repositories/` — including a **concurrency test proving two simultaneous balance adjustments both
   land** (finding 14)
3. `features/*/services/` — business logic, no Discord objects involved
4. Commands via `CommandContext`
5. `integrations/` — against recorded fixtures, with Zod validation at the boundary

Set honest coverage thresholds (start ~40% lines) and ratchet, rather than excluding most of the codebase from
measurement. Full config in [`../migration/12-TOOLING.md`](../migration/12-TOOLING.md#6-testing--vitest).
