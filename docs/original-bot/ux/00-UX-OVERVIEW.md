# UI / UX Documentation

How Testify's commands actually feel to use — the buttons, select menus and modals that make features work
without users typing IDs — and how to carry that forward into the TypeScript rewrite.

**Why this section exists separately from the rest of the notes:** the interaction design is invisible from the
command definitions. Nothing in `/shop`'s `SlashCommandBuilder` tells you it opens a browsable catalogue you
click through; that lives buried in an 883-line event file. It is the part of the product most likely to be
silently lost in a rewrite, so it gets its own documentation.

---

## The documents

| Document | Contents |
|---|---|
| [`01-CURRENT-PATTERNS.md`](01-CURRENT-PATTERNS.md) | What exists today — the shop drill-down exemplar, the six interaction archetypes, ownership rules, and the two competing dispatch mechanisms |
| [`02-COMPONENT-REGISTRY.md`](02-COMPONENT-REGISTRY.md) | **Every custom ID in the bot** — what mints it, what handles it, and the known collisions. The reference table when adding or renaming a component |
| [`03-GAPS.md`](03-GAPS.md) | Where the bot still forces users to type things it shouldn't — including music, which has **zero** interactive components |
| [`04-TARGET-DESIGN.md`](04-TARGET-DESIGN.md) | The TypeScript design: screens, state in custom IDs, declarative ownership, and the reusable builders |
| [`05-FEATURE-BLUEPRINTS.md`](05-FEATURE-BLUEPRINTS.md) | Concrete proposed flows — the music control panel, settings panels, economy quick actions |

---

## The design principle

> **The user should never have to know or type an ID.**

If a value exists in the database and the bot can enumerate it, the user should be picking it from a menu or
pressing a button — not typing `/pet-shop <id>`. Where the bot already achieves this it is genuinely good, and
`01-CURRENT-PATTERNS.md` documents exactly how so the pattern can be reused. Where it doesn't, `03-GAPS.md`
says so.

Four supporting rules, each derived from what already works well in the codebase:

1. **Mutate one message, don't spam the channel.** Use `interaction.update()`, not a fresh `reply()`.
   Currently 55 vs 130 — the ratio should invert.
2. **Every screen needs a way back**, and lateral navigation should persist so users can move between
   sections without re-running the command.
3. **Chain into the next action.** Adopting a pet hands you a "Check on your pet" button. The user should
   rarely have to return to a command picker.
4. **Never destroy data on the first click.** Confirm/cancel on everything irreversible.

---

## Where this fits with the rest of the notes

| Related document | Relationship |
|---|---|
| [`../02-CONTRACTS.md`](../02-CONTRACTS.md) | The current custom-ID conventions and the 27-listener fan-out, as an audit finding |
| [`../migration/11-TYPED-CONTRACTS.md`](../migration/11-TYPED-CONTRACTS.md) | The `ComponentHandler` interface and the custom-ID codec |
| [`../migration/18-HELPERS-AND-UTILS.md`](../migration/18-HELPERS-AND-UTILS.md) | `ui/components.ts` and `ui/pagination.ts` signatures |
| [`../migration/14-MIGRATION-PHASES.md`](../migration/14-MIGRATION-PHASES.md) | Phase 4 ports the event layer, which is where these handlers live |
| [`../events/`](../events/) | Per-file detail on each handler mentioned here |

**Ordering note:** the UX work is not a separate phase. Ports of a feature in Phase 5 should build that
feature's screens as they go, using the helpers from Phase 2 — see `04-TARGET-DESIGN.md`.
