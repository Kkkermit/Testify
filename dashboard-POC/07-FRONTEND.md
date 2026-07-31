# 7. Frontend

Vite + React + TypeScript, Tailwind for styling, shadcn/ui for components, Jest + React Testing Library for
tests. As requested.

## Dependencies

```bash
npm create vite@latest dashboard -- --template react-ts

# Routing and server state
npm i -w dashboard react-router-dom @tanstack/react-query

# Forms, sharing the bot's zod
npm i -w dashboard react-hook-form @hookform/resolvers zod

# Styling — Tailwind v4
npm i -w dashboard -D tailwindcss @tailwindcss/vite

# What shadcn components are built on
npm i -w dashboard class-variance-authority clsx tailwind-merge lucide-react tailwindcss-animate

# Tests
npm i -w dashboard -D jest jest-environment-jsdom @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event @swc/jest jest-axe msw
```

Runtime dependencies stay under ten. Radix primitives arrive individually as components are added, each one a
small focused package.

### A note on "installing shadcn components through npm"

Worth being precise, because it affects how the codebase is laid out.

**shadcn/ui does not publish its components as npm packages.** Its whole model is the opposite: a CLI copies the
component's source into your repository and you own it from then on.

```bash
npx shadcn@latest init          # writes components.json, sets up the token layer
npx shadcn@latest add button card dialog table tabs switch select toast
```

That writes `dashboard/src/components/ui/button.tsx` into your tree. What _is_ installed from npm is everything
those files import: `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` —
the `npm i` line above. The CLI adds each Radix package as it needs it.

This is the right model for an open-source project. The components are in your repo, so a contributor can read
and change them, they are reviewable in a diff, and there is no upstream release that can change a button's
markup underneath you. It also means shadcn components are **not** in `package.json` and cannot be updated by
`npm update` — the trade-off, and an intentional one.

The `shadcn.io` registry you linked serves components through the same CLI (`npx shadcn@latest add
"https://shadcn.io/r/<name>.json"`). Same copy-in mechanism, third-party source — review anything you pull from
a registry before shipping it, since it lands as your code with your name on it.

## Structure

By feature, not by file type. A settings page's component, hook, schema and test sit together, so adding a
feature is one folder and deleting one is `rm -r`.

```
dashboard/src/
├── main.tsx                  Providers: QueryClient, Router, Theme, Toaster
├── routes.tsx                Route table, lazy-loaded pages
├── app/
│   ├── AppShell.tsx          Sidebar + header + <Outlet />
│   ├── RequireAuth.tsx       Redirects to sign-in on 401
│   └── ErrorBoundary.tsx
├── lib/
│   ├── api.ts                fetch wrapper: credentials, CSRF header, error mapping
│   ├── queries.ts            Query key factory — one place, no stringly-typed keys
│   └── format.ts             Numbers, dates, permission names
├── components/
│   ├── ui/                   shadcn output — treat as vendored, edit deliberately
│   └── common/               SavingIndicator, EmptyState, ConfirmDialog, RoleBadge,
│                             ChannelPicker, RolePicker, PageHeader, StatTile
├── features/
│   ├── auth/
│   ├── guild-overview/
│   ├── levelling/            LevellingPage, useLevelling, BoostRow, RewardRow, *.test.tsx
│   ├── audit-logging/
│   ├── welcome/
│   ├── moderation/
│   ├── economy/
│   └── owner/
└── test/
    ├── setup.ts              jest-dom, MSW server lifecycle
    ├── handlers.ts           Default MSW handlers
    └── renderWithProviders.tsx
```

`components/ui` is vendored code. Editing it is allowed — that is the point of shadcn — but it should be a
deliberate, commented change, because `npx shadcn add` can overwrite it.

## Data fetching: TanStack Query

Every server read is a query; every write is a mutation that invalidates the queries it affects. No `useEffect`

- `fetch` + three `useState`s, which is where loading and error states go to die.

```ts
// features/levelling/useLevelling.ts
export function useLevelling(guildId: string) {
	return useQuery({
		queryKey: keys.guild(guildId).levelling(),
		queryFn: () => api.get<LevelConfig>(`/guilds/${guildId}/levelling`),
		staleTime: 30_000,
	});
}

export function useUpdateLevelling(guildId: string) {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (patch: Partial<LevelConfig>) => api.patch(`/guilds/${guildId}/levelling`, patch),

		// Optimistic: a toggle that lags 400ms feels broken.
		onMutate: async (patch) => {
			await client.cancelQueries({ queryKey: keys.guild(guildId).levelling() });
			const previous = client.getQueryData(keys.guild(guildId).levelling());
			client.setQueryData(keys.guild(guildId).levelling(), (old) => ({ ...old, ...patch }));
			return { previous };
		},
		onError: (error, _patch, context) => {
			client.setQueryData(keys.guild(guildId).levelling(), context?.previous);
			toast.error(messageFor(error)); // roll back AND say why
		},
		onSettled: () => client.invalidateQueries({ queryKey: keys.guild(guildId).levelling() }),
	});
}
```

Optimistic updates with a rollback and a toast are the difference between a dashboard that feels native and one
that feels like a form from 2009. The rollback matters as much as the optimism: a switch that flips back with
"You need Manage Server in this guild" is honest, whereas one that stays on while the server said no is a lie.

**Query key factory** so keys are never hand-written strings:

```ts
export const keys = {
	me: () => ["me"] as const,
	guild: (id: string) => ({
		all: () => ["guild", id] as const,
		overview: () => ["guild", id, "overview"] as const,
		levelling: () => ["guild", id, "levelling"] as const,
		channels: () => ["guild", id, "channels"] as const,
		roles: () => ["guild", id, "roles"] as const,
	}),
	owner: { stats: () => ["owner", "stats"] as const },
};
```

`invalidateQueries({ queryKey: keys.guild(id).all() })` then clears everything for a guild in one call — needed
after a destructive action.

## The fetch wrapper

One place that knows about credentials, CSRF and error shapes:

```ts
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
	const response = await fetch(`/api${path}`, {
		method,
		credentials: "same-origin", // send the session cookie
		headers: {
			...(body ? { "content-type": "application/json" } : {}),
			...(method !== "GET" ? { "x-csrf-token": readCookie("dash_csrf") ?? "" } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	});

	if (response.status === 401) throw new UnauthorisedError(); // RequireAuth catches this
	if (!response.ok) throw await ApiError.from(response); // carries code + issues
	return response.status === 204 ? (undefined as T) : response.json();
}
```

`ApiError` keeps the server's `code` and `issues`, so a form can map validation issues onto fields and a page can
branch on `missing_manage_guild` versus `guild_not_found` and show genuinely different screens.

## Forms

`react-hook-form` + `zodResolver`, with the **schema imported from `@testify/shared`** — the same object the API
validates with (`02-ARCHITECTURE.md`).

```ts
const form = useForm<LevelRewardInput>({
	resolver: zodResolver(levelRewardSchema), // shared with the server
	defaultValues: { level: 10, roleId: "" },
});
```

The client cannot accept something the server rejects, and a limit changes in one file. Server-side validation
still runs — the client is a convenience, never the gate.

## Routing

```
/                                   → redirect to /guilds
/sign-in                            → the only unauthenticated page
/guilds                             → picker: manageable guilds, plus invite cards
/guilds/:id                         → overview
/guilds/:id/levelling
/guilds/:id/audit-logging
/guilds/:id/welcome
/guilds/:id/automod
/guilds/:id/economy
/guilds/:id/moderation
/guilds/:id/members/:userId
/owner                              → owner console (403 → not-found, do not confirm it exists)
/owner/guilds
/owner/blacklist
/owner/commands
```

Pages are `React.lazy`-loaded per route, so the owner console is not in a server manager's bundle. Set
`document.title` on every route change — a screen-reader user navigating by tab title needs it, and it makes
browser history usable (`10-ACCESSIBILITY.md`).

## State that is not server state

Almost none, which is the goal.

- Theme (dark by default): `localStorage` + a class on `<html>`.
- Sidebar collapsed: `localStorage`.
- Everything else: URL params (page number, filters, the open tab) so a link is shareable and Back works.

No Redux, no zustand. If a global store becomes genuinely necessary, that is a signal something belongs in the
URL or in TanStack Query instead.

## Build

`vite.config.ts`:

- `@tailwindcss/vite` and `@vitejs/plugin-react`.
- `resolve.alias`: `@` → `dashboard/src`, `@testify/shared` → `../shared/src`.
- `server.proxy["/api"] = "http://localhost:3000"` — no CORS in development (`02-ARCHITECTURE.md`).
- `build.outDir = "dist"`, served by the bot in production.
- `build.sourcemap = true` — it is open source; a stack trace someone can read is worth the file size.
- Manual chunks: split `react`/`react-dom` and `@tanstack/react-query` into a vendor chunk so an app change does
  not invalidate the whole cache.

Budget: first load under 200 kB gzipped. Lazy routes, `lucide-react` imported per icon (it tree-shakes, but only
if you import named icons rather than the barrel), no chart library until something genuinely needs a chart. The
brief said lightweight; a 900 kB bundle for a settings page is the usual way that promise gets broken.
