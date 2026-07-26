# 16 — Testing Strategy

**Runner: Jest**, with `@swc/jest` on CommonJS. Config in
[`12-TOOLING.md`](12-TOOLING.md#6-testing--jest); current-state analysis in
[`../infra/tests.md`](../infra/tests.md).

**The starting point:** 8 test files covering 8 commands out of ~170, and **zero** tests for the loader, the
dispatch core, all 32 models, every event handler and every integration. This document is about closing that
gap in the right order.

---

## 1. The testing pyramid for this bot

Most Discord bot test suites fail because they try to test Discord. Don't.

```
        ╱ smoke ╲          A handful. Loader boots, every command registers, no duplicate
       ╱─────────╲         custom-ID namespaces. Catches wiring breakage.
      ╱  commands ╲        One per command, via CommandContext. Asserts on what the user
     ╱─────────────╲       would see, not on discord.js internals.
    ╱  repositories ╲      Every query shape, against mongodb-memory-server. Includes the
   ╱─────────────────╲     concurrency tests that lock in the money-duplication fix.
  ╱     services      ╲    THE BULK. Pure functions: XP curves, payout maths, cooldowns,
 ╱─────────────────────╲   duration parsing, weighted lottery draws. No Discord, no DB.
```

**The design goal is that most logic ends up in `services/`** — plain functions taking plain data. That is
what makes a suite fast and worth maintaining. If a rule feels hard to test, it is usually because it is
buried inside an `execute()` that also does I/O; extract it.

### What NOT to test

| Don't test | Why |
|---|---|
| discord.js itself | `EmbedBuilder` produces valid embeds. Not your job. |
| Canvas/image output | Pixel comparison is brittle and slow. Test the *data* fed to the renderer. |
| Third-party APIs live | Network-dependent, rate-limited, flaky. Use recorded fixtures. |
| Getters, thin wrappers, config objects | No behaviour, no value. |
| Exact embed copy | Asserting on full description strings makes every wording change a test failure. Assert on structure and key values. |

---

## 2. Layout

```
tests/
  setup.ts                    Global setup — ONE frozen clock, env stubs
  helpers/
    mockDiscord.ts            mockUser, mockGuild, mockMember, mockChannel, mockInteraction
    mockContext.ts            createMockContext — the command harness
    mongo.ts                  mongodb-memory-server lifecycle
    fixtures/
      economy.ts  guild.ts  clashRoyale.json  spotify.json  …
  core/
    loader.test.ts  router.test.ts  customId.test.ts  middleware.test.ts  errors.test.ts
  database/
    economyRepository.test.ts  guildSettingsRepository.test.ts  …
  features/
    economy/  moderation/  levelling/  …    (mirrors src/features/)
  regression/
    findings.test.ts          Locks in the audit's specific bugs
```

Mirroring `src/features/` matters: when someone changes `features/economy/services/payout.ts`, the test file
is obviously `tests/features/economy/payout.test.ts`.

---

## 3. Fix the setup problems first

Today's harness has three defects that would carry straight over:

| Problem | Fix |
|---|---|
| `setup.js` freezes `Date.now()` **and** `testUtils.js` calls `setSystemTime()` — two conflicting clocks | One clock, in `setup.ts`, via `jest.useFakeTimers({ now: FIXED })`. Nothing else touches time. |
| `setup.js` stubs `process.env.clientId` while the code reads `clientid` — **the stub is ineffective** | One spelling, taken from the validated env schema. |
| Mock `client.config` is a hand-maintained 6-key subset of a ~110-key object that silently drifts | Build the mock **from the real typed config**, so a new required key is a compile error, not a runtime surprise. |

```ts
// tests/setup.ts
import { FIXED_NOW } from './helpers/time';

beforeEach(() => { jest.useFakeTimers({ now: FIXED_NOW }); });
afterEach(() => { jest.useRealTimers(); });   // clearMocks/restoreMocks are on in jest.config.ts
```

---

## 4. Mocking discord.js

The current suite does `jest.mock('discord.js')` wholesale, which replaces the entire library — including
`EmbedBuilder`, `PermissionFlagsBits` and the enums the code under test needs. That is why those tests are
brittle.

**Use typed factory builders instead. Never mock the whole module.**

```ts
// tests/helpers/mockDiscord.ts
import type { Guild, GuildMember, User } from 'discord.js';

export function mockUser(over: Partial<User> = {}): User {
  return { id: '111111111111111111', username: 'testuser', bot: false,
           displayAvatarURL: () => 'https://cdn.example/avatar.png', ...over } as unknown as User;
}

export function mockGuild(over: Partial<Guild> = {}): Guild {
  return { id: '222222222222222222', name: 'Test Guild', memberCount: 42,
           members: { cache: new Collection(), fetch: jest.fn() }, ...over } as unknown as Guild;
}

export function mockMember(over: Partial<GuildMember> = {}): GuildMember {
  return { id: '111111111111111111', user: mockUser(),
           permissions: { has: jest.fn().mockReturnValue(true) },
           kickable: true, bannable: true, ...over } as unknown as GuildMember;
}
```

The single `as unknown as T` cast per factory is deliberate: it is confined to the helper file, and every
*consumer* then gets full type-safety. Do not scatter casts through the specs.

---

## 5. Testing commands — the `CommandContext` harness

This is the payoff of the abstraction in [`11-TYPED-CONTRACTS.md`](11-TYPED-CONTRACTS.md#3-commandcontext--the-surface-abstraction).
Because commands depend on a small context interface rather than a discord.js `Interaction`, the harness is
about 30 lines and every command becomes testable.

```ts
// tests/helpers/mockContext.ts
export function createMockContext(over: Partial<MockContextInput> = {}) {
  const reply = jest.fn().mockResolvedValue(undefined);
  const editReply = jest.fn().mockResolvedValue(undefined);
  const ctx: CommandContext = {
    client: mockClient(), surface: 'slash',
    guild: over.guild ?? mockGuild(),
    user: over.user ?? mockUser(),
    member: over.member ?? mockMember(),
    channel: over.channel ?? mockChannel(),
    commandName: over.commandName ?? 'test',
    options: mockOptions(over.options ?? {}),
    reply, editReply, defer: jest.fn(), followUp: jest.fn(),
  };
  return Object.assign(ctx, { reply, editReply });   // spies exposed for assertions
}
```

```ts
// tests/features/economy/balance.test.ts
describe('/balance', () => {
  it('shows the wallet and bank totals', async () => {
    jest.spyOn(economyRepository, 'getOrCreateAccount')
        .mockResolvedValue(economyFixture({ wallet: 250, bank: 1000 }));

    const ctx = createMockContext({ options: { user: mockUser() } });
    await balanceCommand.execute(ctx);

    const [{ embeds }] = ctx.reply.mock.calls[0];
    expect(embeds[0].data.description).toContain('250');
    expect(embeds[0].data.description).toContain('1000');
  });

  it('creates an account on first use rather than erroring', async () => { /* … */ });
});
```

**Because the same command serves both surfaces, run the surface-sensitive cases twice:**

```ts
it.each(['slash', 'prefix'] as const)('works on the %s surface', async (surface) => {
  const ctx = createMockContext({ surface });
  await balanceCommand.execute(ctx);
  expect(ctx.reply).toHaveBeenCalled();
});
```

That parameterisation is what proves the shared-core deduplication actually holds — and it is impossible to
write against the current codebase, where the two surfaces are separate files.

---

## 6. Repository tests

Use **`mongodb-memory-server`** — a real MongoDB, in-process. Mocking Mongoose is not worth it: the bugs here
are in query semantics, which a mock cannot reproduce.

```ts
// tests/helpers/mongo.ts
let mongod: MongoMemoryServer;
export async function startMemoryMongo() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}
export async function stopMemoryMongo() { await mongoose.disconnect(); await mongod.stop(); }
export async function clearCollections() {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
}
```

### The concurrency test that matters

Finding 14 is a real, exploitable money-duplication bug caused by read-modify-`save()`. The atomic `$inc`
rewrite fixes it — **and this test is what stops it coming back:**

```ts
it('does not lose writes under concurrent adjustments', async () => {
  await economyRepository.getOrCreateAccount('g1', 'u1');

  // 50 concurrent +10 adjustments. Read-modify-save loses most of these.
  await Promise.all(Array.from({ length: 50 }, () =>
    economyRepository.adjustWallet('g1', 'u1', 10)));

  const account = await economyRepository.getOrCreateAccount('g1', 'u1');
  expect(account.wallet).toBe(500);   // exactly 500, not "somewhere under 500"
});
```

Write the equivalent for `transfer()` — asserting that the pair sums to a constant, so money is never created
or destroyed — and for the lottery draw's overlap guard (finding 15).

Also test: the `{ guildId, userId }` unique index rejects duplicates, and `getOrCreateAccount` is idempotent
under concurrent first-use.

---

## 7. Core framework tests

These are cheap and catch entire classes of the audit's bugs.

```ts
// tests/core/customId.test.ts
it('round-trips namespace, action and args', () => {
  expect(decodeId(encodeId('shop', 'buy', 'item_42'))).toEqual(
    { ns: 'shop', action: 'buy', args: ['item_42'] });
});

it('rejects IDs over Discord\'s 100-character limit', () => {
  expect(() => encodeId('modpanel', 'timeout', 'x'.repeat(120))).toThrow(/100/);
});

// tests/core/router.test.ts
it('refuses two handlers claiming the same namespace', () => {
  const r = new ComponentRouter();
  r.register('spotify', handlerA);
  expect(() => r.register('spotify', handlerB)).toThrow(/Duplicate namespace/);
});
```

That last test is the one that would have caught the live `spotify-tracks` collision (finding 12) — two
handlers claiming the same IDs, producing `InteractionAlreadyReplied` in production.

Also cover: the loader rejects a module missing `name`/`execute` (which today silently registers
`client.on(undefined)`), the middleware pipeline short-circuits correctly, and the permission gate handles
`member === null` in DMs without throwing (finding 22).

---

## 8. Integration tests — recorded fixtures, never live

```ts
it('parses a Clash Royale player response', async () => {
  server.use(http.get('*/players/:tag', () => HttpResponse.json(clashPlayerFixture)));
  const player = await clashClient.getPlayer('#ABC123');
  expect(player.trophies).toBe(5432);
});

it('surfaces a rate limit as a typed failure, not null', async () => {
  server.use(http.get('*/players/:tag', () => new HttpResponse(null, { status: 429 })));
  await expect(clashClient.getPlayer('#ABC')).resolves.toMatchObject({ ok: false, reason: 'rate_limited' });
});
```

That second test encodes a real improvement: today every Instagram failure mode collapses to `null`, so
callers cannot tell "user doesn't exist" from "we're rate limited". Use `msw` or `nock` — the choice matters
less than never hitting the network.

Capture fixtures once from a real response, commit them, and **scrub tokens and personal data** before doing so.

---

## 9. Regression tests for the audit findings

A dedicated file, each test naming its finding. These are the highest-value tests in the suite because each
one corresponds to a bug that actually shipped.

| Finding | Test |
|---|---|
| 1, 2 | Every registered event handler's declared signature matches its discord.js payload — the check that catches "the handler never runs" |
| 3 | The generated `.env` keys exactly match the env schema's keys, casing included |
| 8, 9 | Every command's `permissions` array contains only defined `PermissionFlagsBits` values (no `undefined`) |
| 10 | Message handlers survive a DM (`guild === null`) without throwing |
| 12 | No two component handlers share a namespace |
| 14 | Concurrent balance adjustments do not lose writes |
| 21 | Prefix matching is case-insensitive on both sides |
| 25 | XP is credited once per message, not twice |
| 26 | Rate-limited channel renames are caught, not left unhandled |
| 31 | Empty auto-role arrays are handled (`=== 0`, not `< 0`) |
| 36 | One model per collection — asserted over the model registry |
| 65 | No source file contains `ephemeral:` — a lint rule backs this, the test documents intent |

Finding 8 is a good example of the leverage: it is a **single loop over the command registry**, and it makes
an entire bug class impossible.

---

## 10. Coverage

Start at **40% lines / 40% functions / 30% branches** and ratchet. That is deliberately modest — today's
config sets no thresholds *and* excludes `scripts`, `schemas`, `events`, `functions`, `config.js` and
`index.js` from the denominator, so the reported number can never look bad.

Sensible per-layer targets once the rewrite settles:

| Layer | Target | Note |
|---|---|---|
| `core/` | 90% | Small, pure, and everything depends on it |
| `database/repositories/` | 85% | Where the money bugs live |
| `features/*/services/` | 80% | The bulk of real logic |
| `features/*/commands/` | 60% | Happy path + permission denial + the main error path |
| `features/*/components/` | 50% | Focus on state transitions |
| `integrations/` | 70% | Parsing and error mapping, against fixtures |
| `ui/` | 70% | Formatters are pure and trivial to cover |

**Coverage is a floor, not a goal.** One good concurrency test on `adjustWallet` is worth more than 200 lines
of getter coverage.

---

## 11. CI

`npm run check` = `typecheck && lint && format:check && test`. All four block the build — today CI runs
**only** `npm run test`, which is why the style and type drift in the audit went unnoticed.

Keep the suite under ~60 seconds. If `mongodb-memory-server` makes that hard, split
`test:unit` (fast, on every push) from `test:integration` (on PR).
