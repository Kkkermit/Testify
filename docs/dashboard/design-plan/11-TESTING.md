# 11. Testing

Jest and React Testing Library, matching the bot's toolchain rather than introducing a second one.

## A note on Jest with Vite

Vite's natural partner is Vitest, and it would need less configuration. You asked for Jest, and Jest is what the
bot already runs with `@swc/jest` — so the dashboard uses the same transform, the same coverage thresholds and
the same `npm test`. That consistency is worth the extra config file, and the config is not complicated:

```ts
// dashboard/jest.config.ts
export default {
	displayName: "dashboard",
	testEnvironment: "jsdom",
	setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
	transform: {
		"^.+\\.(t|j)sx?$": [
			"@swc/jest",
			{
				jsc: { transform: { react: { runtime: "automatic" } } },
			},
		],
	},
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@testify/shared/(.*)$": "<rootDir>/../shared/src/$1",
		"\\.css$": "<rootDir>/src/test/styleMock.ts",
	},
	collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/components/ui/**", "!src/**/*.d.ts"],
	coverageThreshold: { global: { statements: 80, branches: 80, functions: 80, lines: 80 } },
};
```

Three things that will otherwise cost an afternoon each:

- **`runtime: "automatic"`** or every test file needs `import React`.
- **CSS imports must be mocked.** Jest cannot parse `@import "tailwindcss"`.
- **`components/ui` is excluded from coverage.** It is vendored shadcn source; testing Radix's dialog is testing
  someone else's library, and including it would either tank the coverage number or fill the suite with
  meaningless tests.

Wire both projects into one root command so `npm run check` covers everything:

```jsonc
// root package.json
"test": "jest --projects jest.config.ts dashboard/jest.config.ts"
```

## MSW for the API boundary

Mock at the network layer, not by stubbing hooks. A test that mocks `useLevelling` proves the component renders
an object; a test that mocks `GET /api/guilds/1/levelling` proves the whole chain — query key, fetch wrapper,
error mapping, component — actually works.

```ts
// src/test/handlers.ts
export const handlers = [
	http.get("/api/auth/me", () => HttpResponse.json({ user: someone, isOwner: false, guilds: [guild] })),
	http.get("/api/guilds/:id/levelling", () => HttpResponse.json(levelConfig)),
	http.patch("/api/guilds/:id/levelling", () => new HttpResponse(null, { status: 204 })),
];
```

Per-test overrides express the interesting cases:

```ts
server.use(
	http.patch("/api/guilds/:id/levelling", () =>
		HttpResponse.json({ error: { code: "missing_manage_guild", message: "…" } }, { status: 403 }),
	),
);
```

**Keep the fixtures honest.** Build them from the zod schemas in `@testify/shared` so a fixture cannot drift from
what the API actually returns — the mistake that makes a green suite meaningless.

## What is worth testing

Ranked by how much a failure would cost.

### 1. Permission logic — exhaustive

`shared/src/permissions.ts` is a pure function; test the whole truth table. Owner not in the guild, manager
without `ManageGuild`, member of a guild the bot is not in, and so on. This is the code that stops someone
configuring a server they do not own.

### 2. The API's guard middleware — integration, no browser

Hono routes are callable directly:

```ts
const response = await app.request("/api/guilds/123/levelling", {
	headers: { cookie: `dash_session=${session.id}` },
});
expect(response.status).toBe(403);
```

Cover every row of the threat table in `03-AUTH.md`: missing CSRF, bad state, expired session, guild id in the
body being ignored, a demoted user getting 403 on their next request.

**Prove these can fail.** `CLAUDE.md` §17 — introduce the hole, watch the test go red, revert. A permission test
that passes vacuously is worse than none.

### 3. Screen states

For each page: loading skeleton, populated, empty, 403, 404, 500. Six tests per page, mostly copy-paste, and they
catch the crash-on-undefined that kills a page for a guild with no data.

```tsx
it("explains why a manager cannot open the owner console", async () => {
	server.use(http.get("/api/owner/stats", () => HttpResponse.json({ error: { code: "not_owner" } }, { status: 403 })));

	renderWithProviders(<OwnerPage />);
	expect(await screen.findByText(/only the bot owner/i)).toBeInTheDocument();
});
```

### 4. Optimistic update rollback

The behaviour most likely to be subtly wrong, and the one users notice:

```tsx
it("puts the switch back and says why when the server refuses", async () => {
	server.use(
		http.patch("*/levelling", () =>
			HttpResponse.json(
				{ error: { code: "missing_manage_guild", message: "You need Manage Server." } },
				{ status: 403 },
			),
		),
	);

	renderWithProviders(<LevellingPage />);
	const toggle = await screen.findByRole("switch", { name: /members earn xp/i });

	await user.click(toggle);
	expect(toggle).toBeChecked(); // optimistic
	await waitFor(() => expect(toggle).not.toBeChecked()); // rolled back
	expect(await screen.findByText(/need manage server/i)).toBeInTheDocument();
});
```

### 5. Forms

Client validation matching the shared schema, server issues landing on the right field, submit disabled while
pending, and no double-submit on a double-click.

### 6. Accessibility

`jest-axe` on every page-level test (`10-ACCESSIBILITY.md`), plus explicit assertions for the things axe cannot
see: focus returning to the trigger after a dialog closes, and `document.title` changing on navigation.

## What is not worth testing

- shadcn/Radix internals. Does the dialog trap focus? Radix's own suite answers that.
- Tailwind classes. `expect(el).toHaveClass("bg-card")` tests a string, and breaks on every restyle.
- Exact copy. Assert on roles and accessible names; `getByRole("button", { name: /save/i })` survives a wording
  change, `getByText("Save changes")` does not.
- Snapshots of whole pages. They are updated reflexively and stop meaning anything within a month.

## Query conventions in tests

Use the queries in the order the Testing Library docs recommend, because it doubles as an accessibility check:
`getByRole` → `getByLabelText` → `getByText` → `getByTestId` as a last resort. If a control cannot be found by
role and name, a screen reader user cannot find it either — the test failure _is_ the bug.

Always `userEvent`, never `fireEvent`. `userEvent.click` fires the pointer, focus and keyboard events a real
click does; `fireEvent.click` fires one synthetic event and passes for components that would not work in a
browser.

## The render helper

One wrapper, so no test assembles providers by hand:

```tsx
export function renderWithProviders(ui: ReactNode, { route = "/", ...options } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } }, // no retries: a 500 test would take 30s
	});

	return {
		user: userEvent.setup(),
		...render(
			<QueryClientProvider client={client}>
				<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
			</QueryClientProvider>,
			options,
		),
	};
}
```

`retry: false` is essential — TanStack Query retries three times with backoff by default, so an error-state test
would hang until Jest's timeout and then fail for the wrong reason.

## Bot-side tests

The API code lives in `src/api/` and is covered by the **bot's** Jest project, in `tests/api/`, mirroring the
existing convention. It gets `mongodb-memory-server` from `tests/helpers/mongo.ts` for session and audit
persistence, and the existing `createMockClient()` for the discord.js side.

The mock client needs a small extension: `guilds.cache`, `guild.members.fetch`, `guild.roles.cache` and
`guild.channels.cache`, so `requireGuild` is testable. Add it to `tests/helpers/mocks.ts` where the other
factories live, typed so a mock that drifts from the real Discord shape is a compile error.

## CI

Extend `.github/workflows/ci.yml` rather than adding a workflow:

- `check` runs typecheck, lint, format and **both** Jest projects.
- `build` builds the bot _and_ the dashboard, and keeps verifying the `dist/` artifact — the alias grep from
  `CLAUDE.md` §3 must be scoped so it does not walk the SPA bundle.
- Coverage thresholds enforced on both, both at 80/80/80/80.

The `dist/` smoke test also needs extending: after `npm run build`, assert `dashboard/dist/index.html` exists and
that the API serves it. A dashboard that builds but 404s in production is exactly the class of failure that
passes every unit test — the same reason the bot smoke-tests its loader against a real build.
