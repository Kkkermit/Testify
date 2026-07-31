# 12. Setup, build and deployment

The measure here is Persona C from `01-SCOPE.md`: someone who cloned the repo and wants the dashboard running in
ten minutes on a cheap VPS, without a second service or a paid tier.

## The rule that shapes everything: off by default

`DASHBOARD_ENABLED` defaults to `false`. A self-hoster who only wants the bot gets exactly the bot — no port
bound, no OAuth needed, no new required environment variables. `src/config/env.ts` validates once at startup and
fails with a list (`CLAUDE.md` §14), so the dashboard's variables must be **optional at the schema level** and
only required _together_, when the feature is on.

Zod expresses that as a `superRefine` on the whole object rather than per-field `.optional()` guesswork:

```ts
.superRefine((env, ctx) => {
	if (!env.DASHBOARD_ENABLED) return;

	for (const key of ["DISCORD_CLIENT_SECRET", "DASHBOARD_BASE_URL", "DASHBOARD_SESSION_SECRET"] as const) {
		if (!env[key]) {
			ctx.addIssue({ code: "custom", path: [key], message: "is required when DASHBOARD_ENABLED is true" });
		}
	}
});
```

That way the failure message names every missing value at once, which is the behaviour the bot's env loader
already promises.

## New environment variables

| Variable                     | Required when | Default     | Notes                                                      |
| ---------------------------- | ------------- | ----------- | ---------------------------------------------------------- |
| `DASHBOARD_ENABLED`          | never         | `false`     | The whole feature switch                                   |
| `DISCORD_CLIENT_SECRET`      | enabled       | —           | Developer Portal → OAuth2. **Never in the browser**        |
| `DASHBOARD_BASE_URL`         | enabled       | —           | e.g. `https://dash.example.com`. Builds the redirect URI   |
| `DASHBOARD_SESSION_SECRET`   | enabled       | —           | ≥32 random bytes. Signs cookies, derives the token key     |
| `DASHBOARD_PORT`             | no            | `3000`      |                                                            |
| `DASHBOARD_BIND`             | no            | `127.0.0.1` | Localhost by default; a reverse proxy is the intended path |
| `DASHBOARD_TRUST_PROXY`      | no            | `false`     | Only then is `x-forwarded-for` believed, for rate limiting |
| `DASHBOARD_SESSION_TTL_DAYS` | no            | `7`         |                                                            |

Binding to `127.0.0.1` by default matters. A dashboard that binds `0.0.0.0` the moment it is enabled is exposed
to the internet on a VPS before anyone has thought about TLS. Making the operator set `DASHBOARD_BIND=0.0.0.0`
is a deliberate speed bump with a comment next to it explaining the risk.

Redirect URI is derived, never configured separately: `${DASHBOARD_BASE_URL}/api/auth/callback`. Two sources for
one URL is how people end up with a redirect mismatch they cannot debug, since Discord requires an exact match.

Per `CLAUDE.md` §14, each of these lands in **three** places: the zod schema, both `.env.example` files with a
comment, and `scripts/setupEnv.ts` so the interactive setup prompts for them — conditionally, only if the user
says yes to the dashboard.

## First run

```bash
git clone …
cd Testify
nvm use
npm ci                    # workspaces: installs bot + shared + dashboard
npm run setup             # now also asks: "Enable the web dashboard? (y/N)"
```

If they say yes, `setupEnv.ts` prints the Developer Portal steps before prompting:

```
Enable the web dashboard? (y/N) y

  1. https://discord.com/developers/applications → your app → OAuth2
  2. Copy the Client Secret
  3. Under Redirects, add EXACTLY:
         http://localhost:5174/api/auth/callback
     (add your production URL too when you deploy)

Client secret: ›
Dashboard base URL (http://localhost:5174): ›
Session secret [generated]: ›
```

Generating the session secret for them removes the "what do I put here" question and stops people typing
`changeme`.

Then:

```bash
npm run dev            # bot + API on 3000
npm run dashboard:dev  # Vite on 5174, proxying /api → 3000
```

Two terminals. Or one, with `concurrently` — worth the dependency for the developer experience, since "run these
two commands in two terminals" is a real drop-off point. Add `npm run dev:all`.

## The setup screen

If `DASHBOARD_ENABLED=true` but OAuth is not configured, **do not crash and do not 500**. Serve a setup page that
states exactly what is missing, the precise redirect URI to paste, and the env lines to add
(`09-UX-JOURNEYS.md`, journey 4). Most self-hosted dashboards lose people at this step; a good error page here is
worth more than a feature.

Same for the near-misses: if `DASHBOARD_BASE_URL` does not match the request's origin, say so on the setup
page — that is a redirect mismatch waiting to happen, and it is detectable.

## Building and running in production

```bash
npm run build     # tsup → dist/  AND  vite build → dashboard/dist/
npm start         # one process: bot + API + static SPA
```

The API serves `dashboard/dist` with an SPA fallback (`02-ARCHITECTURE.md`). One origin, so no CORS, no
`SameSite=None`, no third-party cookie problems — and one process to keep alive.

Root scripts:

```jsonc
"build":         "npm run build:bot && npm run build:dashboard",
"build:bot":     "tsup",
"build:dashboard": "npm run build -w dashboard",
"dev:all":       "concurrently -n bot,web -c magenta,cyan \"npm run dev\" \"npm run dashboard:dev\"",
"dashboard:dev": "npm run dev -w dashboard",
```

`npm run check` should gain the dashboard's typecheck and tests so one command still tells you whether the repo
is healthy.

## Reverse proxy

The documented path, because it is where TLS comes from:

```nginx
server {
	server_name dash.example.com;
	listen 443 ssl http2;
	# certs from certbot

	location / {
		proxy_pass http://127.0.0.1:3000;
		proxy_set_header Host              $host;
		proxy_set_header X-Forwarded-For   $remote_addr;
		proxy_set_header X-Forwarded-Proto $scheme;
	}
}
```

With `DASHBOARD_TRUST_PROXY=true` so rate limiting sees real client addresses. Caddy is the two-line alternative
and worth showing as well, since automatic HTTPS removes the certbot step entirely.

**TLS is not optional.** The session cookie is `Secure`, so over plain HTTP it is never sent and nothing works —
which is the correct failure mode, but the docs must say why so nobody "fixes" it by removing `Secure`.

## Docker

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY dashboard/package.json dashboard/
COPY shared/package.json shared/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY dashboard/package.json dashboard/
COPY shared/package.json shared/
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dashboard/dist ./dashboard/dist
USER node
CMD ["node", "dist/index.js"]
```

Plus a `docker-compose.yml` with Mongo, a named volume and a healthcheck hitting `/api/health`. For a lot of
self-hosters `docker compose up -d` is the entire deployment story, and shipping it is a bigger accessibility win
than any single feature.

`@napi-rs/canvas` ships prebuilt binaries for Alpine's musl, so the image stays small. Verify that on the first
build rather than assuming it — a broken canvas would take `/rank` down, not just the dashboard.

## Security checklist for self-hosters

Put this in the README, not buried here:

- [ ] Dashboard behind HTTPS. Never plain HTTP on a public address.
- [ ] `DASHBOARD_BIND` left at `127.0.0.1` unless you know why you are changing it.
- [ ] `DASHBOARD_SESSION_SECRET` is random and unique to this install.
- [ ] The redirect URI in the Developer Portal matches `DASHBOARD_BASE_URL` exactly, including scheme and port.
- [ ] `DISCORD_OWNER_IDS` contains only people you would give your bot token to.
- [ ] Client secret and session secret are not in git. `.gitignore` already covers `.env*` except the examples.
- [ ] If the secret ever leaks: reset it in the Developer Portal, rotate `DASHBOARD_SESSION_SECRET`, and delete
      every `dashboardSession` document.

## Open-source considerations

- **No paid dependency, no hosted service.** No Auth0, no Clerk, no Vercel-only APIs. Discord OAuth and Mongo are
  already required by the bot; the dashboard adds nothing new to the bill.
- **Works on macOS, Windows and Linux.** Node and npm only. Any script that lands in `package.json` uses
  `cross-env` for environment variables, matching the existing `dev` script — and the reason that rule exists is
  written down in `CLAUDE.md` §2.
- **The lockfile is committed** and `npm ci` is the documented install. `CLAUDE.md` §3 records a real CI break
  caused by `npm install` and `npm ci` disagreeing.
- **A contributor can run the dashboard against a real bot in one command** — `npm run dev:all`, with HMR. If
  that stops being true, the contribution rate drops.
- **`CONTRIBUTING.md` gains a dashboard section**: how to add a settings page, where the shared schema goes, and
  the rule from `06-COMMAND-CONTROL.md` that logic belongs in `src/lib/` where Discord can use it too.
- **Screenshots in the README.** The single highest-leverage thing for adoption of a project like this, and the
  reason the design work in `08-DESIGN.md` is worth doing properly.
