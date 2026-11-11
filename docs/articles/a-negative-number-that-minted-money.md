# The negative number that minted money

Testify has an economy: a wallet and a bank per member per server, jobs, a shop, a casino and a lottery. In
November 2026 a full security audit of the bot, its API and its dashboard found one critical bug. Any member of any
server could create as much money as they liked, with one message. This is how it worked, why nothing caught it,
and what changed. It was fixed in 2.3.4.

## The bug

The lottery sells tickets. The subcommand declares how many you may buy:

```ts
options: [{ name: "tickets", description: "How many tickets to buy.", type: "integer", min: 1, max: 100 }],
```

From the slash menu, `/lottery enter tickets:-1000` is impossible. Discord reads `min: 1` and refuses the value
before the bot ever sees it.

But every Testify command also runs as a prefix command, and `t?lottery enter -1000` is just text. The prefix
surface read `-1000`, checked that it was a number, and handed it to the command. The command multiplied it by the
entry fee and took that from the wallet, with this function as it stood then (trimmed):

```ts
export async function debitWallet(guildId: string, userId: string, amount: number) {
	return Economy.findOneAndUpdate({ guildId, userId, wallet: { $gte: amount } }, { $inc: { wallet: -amount } });
}
```

This function is atomic: the balance check and the change happen in one query, so two purchases at once can never
overdraw a wallet. For a positive amount it is correct. For a negative one, every wallet passes `$gte` and
`$inc: -amount` is a credit. The buyer was paid a thousand entry fees, taken out of the prize pool.

## Why nothing caught it

Every layer looked right on its own.

- **The declaration said `min: 1`.** Reading the command, the bound is right there, and on the surface most people
  test, the slash menu, it is enforced.
- **The types were fine.** A negative integer is still an integer.
- **The tests used slash-shaped input.** Nothing ever sent the command a value Discord would have refused, because
  Discord would have refused it.
- **The database code was atomic**, which is the property everyone checks a money function for.

The declaration was being treated as a guarantee, when it was really a request that only one surface honoured.

## It was not only the lottery

Once the shape was clear, the fix was to find every command it applied to, not to patch one. A test now walks
every option in the command registry that declares a `min`, `max`, `choices` or `maxLength`, and sends each one
through the prefix surface just past its bound and on it. Without the fix it listed more than ten leaks:

- a heist could start with a negative stake;
- a birthday could be set to day 0 or day 32;
- casino choices that do not exist were accepted;
- idea and away-note text could run past its limit.

## The fix, in three layers

**1. Every text surface enforces the declaration.** Prefix commands and the dashboard's command runner both read
options from text, so both go through one reader that checks the option against what the command declared, the way
Discord does for slash commands:

```ts
if (typeof value === "number") {
	if (option.min !== undefined && value < option.min) {
		throw new UserFacingError(`\`${name}\` has to be at least ${String(option.min)}.`);
	}
	// …and the maximum, the choices and the length
}
```

`t?lottery enter -1000` now answers "`tickets` has to be at least 1." and moves no money.

**2. The money layer refuses a negative amount anyway.** `debitWallet` and the bank's debit throw on a negative or
non-finite amount before the query runs. A debit below zero is a credit, so it is refused as a programming error
rather than trusted to the caller.

**3. The test enumerates the registry, not the commands someone remembered.** Because it reads every bounded
option from the real registry, a command added next year is covered without anybody writing a test for it. It was
checked against the old code, where it failed and named each leak, before the fix went in.

## The same audit, two smaller findings

**Two regular expressions slowed down sharply on long messages.** The link filter runs on every message the bot
sees, in every server. Its pattern allowed a run of letters and hyphens before a domain, so on a long run of `a-`
with no domain at the end it re-scanned the rest of the message from every position: about 18 ms at 4,000
characters, and five seconds at 100,000. The duration parser took eleven seconds on a long string. A wave of
accounts posting long messages could have held up the event loop. The link filter now needs one letter before the
domain instead of a run, and the duration parser refuses anything longer than a real duration. The rule since then
is that a pattern reading what people type runs in one pass.

**The dashboard raised a content security policy violation on every page load**, because the validation library
probed for `eval` the first time it built a schema. It is now told not to, and the build fails if that setting ever
leaves the bundle it belongs in.

## What held up

The audit also tried things that did not work, which is worth recording too.

- **Inputs:** all 212 API routes and 125 request schemas were sent MongoDB query operators, `__proto__` keys,
  non-finite numbers, control characters and hostile ids. Nothing got past validation.
- **The web layer:** 13 spellings of an open redirect, path traversal, other spellings of the owner console's
  chunk, odd HTTP methods and forged headers all failed.
- **The dashboard:** all 84 routes were loaded with injection payloads in every text field, and no injected
  element appeared.

## The lesson

A limit declared in one place and enforced in another is only as strong as the weakest path to the code. If a
value can arrive by more than one route, the check belongs where every route meets, and the layer that moves money
should refuse nonsense on its own. And when a test can enumerate the thing it protects, it should, because a list
of cases someone remembered is how the lottery got missed.

---

_Testify is an open-source Discord bot with a web dashboard. The code is on
[GitHub](https://github.com/Kkkermit/Testify), and a star there helps other people find it._
