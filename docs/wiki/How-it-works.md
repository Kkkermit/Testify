Short write-ups of how parts of Testify are built and why, each with the code it describes. They're on the website's
docs under **How it works**, and in the repository under
[`docs/articles/`](https://github.com/Kkkermit/Testify/tree/main/docs/articles).

| Article                                                                                               | What it covers                                                                            |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [One command, two surfaces](https://testify.lol/docs/one-command-two-surfaces)                        | How every command runs as both `/ban` and `t?ban` from one file                           |
| [The negative number that minted money](https://testify.lol/docs/a-negative-number-that-minted-money) | A prefix command skipped a limit Discord enforces, and what now holds it on every surface |
| [Switching off a whole feature](https://testify.lol/docs/switching-features-off)                      | `DISABLED_FEATURES`, the declaration behind it, and the tests that keep the two in step   |
| [Testing on three operating systems](https://testify.lol/docs/testing-on-three-operating-systems)     | Skipping instead of passing, fixture dates, and the path separator that broke Windows     |

## The shape of it

- **One process.** The bot, the website and the dashboard's API all run in one Node.js process, so the dashboard
  reads the bot's live view of Discord and there's no second service to deploy.
- **Three workspaces.** The bot in `src/`, the dashboard (Vite and React) in `dashboard/`, and the types and rules
  both share in `shared/`.
- **One command object, both surfaces.** A command is written once, and `src/core/prefix.ts` is the only file that
  knows prefix commands exist.
- **Layers by job.** Commands and buttons answer people, `src/lib/` holds the rules, and
  `src/database/repositories/` holds every query.

The README's [How it fits together](https://github.com/Kkkermit/Testify/blob/main/README.md#️-how-it-fits-together)
has the diagram, and [The codebase](https://testify.lol/docs/codebase) the full tour.

## Why it's built this way

[`AGENTS.md`](https://github.com/Kkkermit/Testify/blob/main/AGENTS.md) records each decision and the reason for it:
§21 lists the decisions already made, and §22 the defects in the original JavaScript bot that the conventions exist
to prevent.
