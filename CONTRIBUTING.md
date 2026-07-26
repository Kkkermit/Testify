# Contributing to Testify

Thanks for taking the time. This document covers the conventions the codebase
follows and what has to pass before a change can be merged.

---

## Getting set up

```bash
npm ci
npm run env:setup
npm run dev
```

`npm ci` installs cleanly with no warnings. If you see one, please open an
issue — that is a bug, not background noise.

Git hooks are installed by `npm ci`:

- **pre-commit** runs ESLint and Prettier over the staged files
- **pre-push** runs the typecheck, the linter and the test suite

---

## Before you open a pull request

```bash
npm run check
```

That runs the typecheck, the linter, the formatting check and the tests — the
same four things CI runs.

---

## Commit messages

Conventional Commits:

```
feat(economy): add atomic wallet adjustments
fix(moderation): read args[0] instead of args[1] for the kick target
docs(readme): document the token encryption key
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

Branches: `feat/…`, `fix/…`, `docs/…`, `refactor/…`.

`npx tsx scripts/commit.ts` builds a conforming message interactively.

---

## Conventions

### Naming

| Kind                 | Convention                                                    |
| -------------------- | ------------------------------------------------------------- |
| Files                | `camelCase.ts`                                                |
| Interfaces and types | `PascalCase`, **no `I` prefix**                               |
| Functions            | `camelCase`, verb first                                       |
| Module constants     | `SCREAMING_SNAKE_CASE`                                        |
| Booleans             | read as assertions: `isEnabled`, `hasPermission`, `canAfford` |

Database fields are `camelCase`, with `guildId` and `userId` universally.

### Size

Files soft-limit at 200 lines and hard-limit at 400. A command's `execute()`
should stay under 40 lines — anything longer belongs in a service.

`services/` must not import discord.js. That single rule is what keeps the bulk
of the logic testable without mocks.

### Comments

Comments explain **why**, never what. Document workarounds with their reason.
No commented-out code. Large numeric literals use separators: `86_400_000`.

---

## Things that must not come back

Each of these was a real defect in v1 and several are enforced by lint rules.

| Pattern                                                | Instead                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Read-modify-`save()` on anything numeric               | An atomic `$inc` in a repository                          |
| Inline `new EmbedBuilder()`                            | The `embed()` factory in `src/ui/embeds.ts`               |
| `console.*`                                            | The logger                                                |
| Unawaited promises                                     | `await`, always                                           |
| `setInterval` outside the timer registry               | `client.timers.interval(...)`                             |
| Ad-hoc custom-ID strings                               | `encodeId()` with a registered namespace                  |
| Single mutable slots on the client                     | Per-invocation state, or a keyed map owned by its feature |
| Hardcoded IDs, emoji or URLs                           | `config/` or the environment                              |
| Queries outside a repository                           | A repository function                                     |
| Catching an error only to return `null`                | Let it reach the error boundary                           |
| `npm install` at runtime, or writing to `node_modules` | Never                                                     |

---

## Adding things

**A command** — drop a file in `src/features/<feature>/commands/`. It is
discovered automatically. Give it a `Category` from the enum and at least one
surface.

**A component** — `src/features/<feature>/components/`, with a namespace
registered in `core/customId.ts`. Duplicate namespaces fail the boot.

**A message feature** — `src/features/<feature>/messages/`, as an ordered
processor. Do not add another `messageCreate` listener.

**An environment variable** — add it to the schema in `src/config/env.ts` and to
the field list in `scripts/setupEnv.ts`. The example file is generated from
that list, so it cannot drift.

---

## Reviewer checklist

- [ ] No read-modify-`save()` on numeric fields
- [ ] Embeds come from the factory
- [ ] No raw `console.*`
- [ ] Every promise awaited
- [ ] Timers registered with the timer registry
- [ ] New custom IDs use the codec and a unique namespace
- [ ] New env vars are in the schema and the setup script
- [ ] No hardcoded IDs, emoji or URLs
- [ ] Business logic sits in `services/`, not in `execute()`
- [ ] Tests cover the new logic
