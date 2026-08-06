# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Report it through GitHub's private vulnerability reporting on this repository,
or to the maintainer directly. Include what you found, how to reproduce it, and
what an attacker could do with it. You can expect an initial response within a
few days.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | ✅        |
| 1.x     | ❌        |

## What this bot does with sensitive data

**Bot credentials** live in environment variables and are never written to the
database or to logs. The `/eval` output redacts any environment value whose key
looks like a secret.

**Third-party OAuth tokens** (Spotify) are encrypted at rest with AES-256-GCM
using `TOKEN_ENCRYPTION_KEY`. Without that key set, the features that would
store a token refuse to run rather than falling back to plaintext.

**The OAuth `state` parameter** is HMAC-signed and expires after ten minutes, so
a crafted callback cannot bind an account to someone else's Discord ID.

**Command execution** is gated by a middleware chain: blacklist, owner-only,
guild-only, NSFW, user permissions, bot permissions and cooldowns. `/eval` runs
in a separate VM context with a five-second timeout and is owner-only.

**Verification codes** are short-lived; MongoDB evicts pending codes after
fifteen minutes.

## Self-hosting notes

- Give the bot only the permissions it needs. It checks its own permissions
  before acting and reports what is missing.
- Keep `DISCORD_OWNER_IDS` to accounts you control. Owner commands include
  `/eval`.
- Restrict network access to the OAuth callback port, or put it behind a proxy
  that terminates TLS.
- `npm audit` runs in CI and the build fails on high-severity findings.

## Dependency scanning

`npm audit --audit-level=high` runs on every CI build, and a nightly workflow
runs it again alongside Snyk so an advisory published overnight is found without
waiting for someone to push. A failing nightly opens an issue labelled
`ci-failure`.

### Suppressions expire

`.nsprc` (npm audit) and `.snyk` hold anything deliberately not acted on. Every
entry needs three things, and an entry missing any of them should be removed:

1. **Why** it cannot be fixed now.
2. **The version that fixes it**, so there is something to wait for.
3. **A hard expiry**, so the suppression cannot rot into a permanent blind spot.

One advisory is suppressed: `GHSA-qwww-vcr4-c8h2`, React Router's RSC-mode CSRF
bypass, which is reachable only through React Server Components. The dashboard
is a browser-only SPA on `createBrowserRouter` with no loaders, no actions and
nothing rendered on the server, so the affected path is not in this build. It
expires on 1 November 2026. Both files also carry a commented example of the
shape to follow.

### Version pins

`overrides` in `package.json` pins transitive dependencies. npm does not allow
comments there, so the reasons live here:

| Pin                                   | Why                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `glob: $glob`                         | Several transitive dependencies still ask for glob v7, which warns on install. Pinned to the version this project already uses. |
| `test-exclude: ^7.0.1`                | Reached through jest's coverage reporter; older releases depend on the deprecated glob v7.                                      |
| `esbuild: ^0.28.1`                    | tsup ships an older esbuild than the one with GHSA-67mh-4wv8-2f99 fixed.                                                        |
| `serialize-javascript: ^7.0.7`        | Reached through jest-worker; older releases carry a prototype-pollution advisory.                                               |
| `brace-expansion: ^5.0.9`             | Reached through eslint-plugin-import-x → minimatch. 5.0.9 fixes GHSA-rgw5-rvv9-x895; minimatch asks for `^5.0.8`.               |
| `fast-uri: ^3.1.5`                    | Reached through better-npm-audit → table → ajv. 3.1.5 fixes GHSA-7p8r-x3mc-p8w7; ajv asks for `^3.0.1`.                         |
| `discord-html-transcripts` → `undici` | The package pins undici v5, which has open advisories. v6 is API-compatible for the calls it makes.                             |

Each one should be dropped the moment its parent updates — check when a
dependency bump lands.
