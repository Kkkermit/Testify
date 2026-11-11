# Testing on three operating systems

Testify has about 4,200 tests. Every pull request runs them on Windows, with coverage and a real MongoDB, and every
night they run on Windows, Linux and macOS. Windows is the one checked on every change because it is what most
people clone the bot onto, and it is the system most open-source projects test least.

The number is not the interesting part. The interesting part is the handful of ways a suite this size can report
green while checking nothing, and what it took to stop each one.

## A test that cannot run must skip, not pass

The repositories, the layer that talks to MongoDB, are tested against a real database started in memory. On a
machine without one, those suites have to do something.

They used to find out in `beforeAll` and return early from each test. Jest counted every one of those as a pass. A
run without MongoDB reported **41 passing tests that asserted nothing**, and a deliberate mutation, replacing an
atomic `$inc` with `$set` in the money code, survived all of them.

Now the decision is made before the suite is built:

```ts
export function describeWithMongo(name: string, suite: () => void): void {
	const uri = testUri();

	if (uri === undefined) {
		describe.skip(name, suite);
		return;
	}
	// …
}
```

A run without a database now says "225 skipped", which is true. And CI sets `REQUIRE_DB_TESTS=1`, so a runner that
cannot start MongoDB fails instead of going quietly green. A convention test refuses the old early-return pattern,
so it cannot come back.

## Fixtures have dates, and databases expire things

Some collections expire their records with a MongoDB TTL index: the command run log keeps 30 days, for example.
The fixtures in those tests carry fixed dates, and the command log's were dated 1 August 2026. On 31 August they
became 30 days old, and MongoDB's TTL sweep, which runs about once a minute, started deleting them partway through
a test on CI. The test passed locally and failed at random on CI, depending on whether the sweep ran during it.

The test database now starts with `ttlMonitorEnabled=false`. A test checks that an expiry is set on a record,
never that MongoDB acted on it, and a test pins the setting so it is not removed by accident.

## Building the database before the run, not during it

Each Jest worker gets its own database. At first every suite created the collections and indexes it needed as it
went, and on the Windows runner that was slow enough to stall: one `deleteMany` outlasted its 20-second hook while
two other workers were building theirs, and five suites once timed out together.

On CI the whole thing is now built up front: every model's collection and indexes in each worker's database, 186
collections, about three seconds on Linux, before the first suite starts. A local run still builds lazily, so running one
test file costs one collection rather than all of them.

## Paths are the classic Windows bug, and it still happens

The rules are simple: build an expected path with `join`, never a POSIX string literal. A fake binary in a test is
a script Node runs, because Windows cannot execute a `#!/bin/sh` file. A test of code that acts on the machine pins
`process.platform`, or a test of the development launcher would really run `taskkill` against a process.

The rules still get broken. A test added for
[switching features off](switching-features-off.md) kept a list of shared files written as
`events/ready/scheduleJobs.event.ts`, and on Windows the file search returned `events\ready\scheduleJobs.event.ts`.
Linux and macOS passed and the Windows runner failed, which is exactly why Windows runs on every pull request. The
fix was `posix: true` on the search, so it returns forward slashes everywhere.

## Fewer tests, each one earning its place

The suite once had 7,253 tests. It went down to 3,469 by removing every test that covered no line or branch the
rest did not, and it has grown again as features were added. Some tests are kept although coverage cannot
see their value:

- a comment naming a bug the test pins;
- an accessibility check;
- a check that a message pings nobody;
- a reply that must stay private;
- a Discord limit, a refusal or a security rule.

A new branch gets the test that covers it, rather than a fifth variant of one that is already there.

## A test has to be able to fail

Coverage says a line ran. It never says anything checked it. The cheap way to find out is to break the code on
purpose: change one operator, re-run the suite that should care, and see whether it notices. That is how the `$inc`
gap above was found, and the same pass cleared the permission checks, the CSRF guard, the sign-in redirect schema
and the dashboard's command runner.

Every enforcement test in the repository is proved this way when it is written: introduce the violation, watch the
test go red, then put the code back. A convention test that passes vacuously is worse than having none, because it
looks like protection.

---

_Testify is an open-source Discord bot with a web dashboard. The code is on
[GitHub](https://github.com/Kkkermit/Testify), and a star there helps other people find it._
