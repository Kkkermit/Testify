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
