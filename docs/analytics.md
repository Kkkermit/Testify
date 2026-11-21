<div align="center">

# 📈 Analytics with Shardlens

**Which commands run, how they end and how long they take, read back in the owner console. Off until you switch it
on, and one setting when you do.**

[![Shardlens](https://img.shields.io/badge/Shardlens-1.2-8b5cf6?style=for-the-badge)](https://github.com/Kkkermit/Shardlens)
[![Off by default](https://img.shields.io/badge/default-off-6b7280?style=for-the-badge)](#-choose-how-to-run-it)
[![Railway](https://img.shields.io/badge/Railway-works-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](#-on-railway)

[Choose](#-choose-how-to-run-it) · [Inside the bot](#-inside-the-bot) · [A collector you run](#-a-collector-you-run) ·
[Railway](#-on-railway) · [Checking it works](#-checking-it-works) · [Trying it out](#-trying-it-out)

</div>

---

The bot counts through [Shardlens](https://github.com/Kkkermit/Shardlens), analytics you run yourself: a collector
keeps the figures, and the owner console's **Usage** tab reads them back. It counts which commands, buttons and forms
ran, how they ended and how long they took, the servers the bot joins and leaves, and the bot's own health. It never
reads message text, and an option's value is counted only when it is one of the command's fixed choices. Only the
bot's owners see any of it. What it keeps, and for how long, is in the dashboard's privacy notice.

With nothing set, nothing is attached and nothing is sent, and no setting here can stop the bot starting: a wrong one
is a warning in the log, and the bot runs without analytics.

## 🧭 Choose how to run it

|                     | Inside the bot                              | A collector you run                                |
| ------------------- | ------------------------------------------- | -------------------------------------------------- |
| To set up           | `SHARDLENS_EMBEDDED=true`                   | A collector, a PostgreSQL and four settings        |
| Who ran what        | Add `SHARDLENS_AUDIT_KEY`                   | Audit mode on the collector, and an activity key   |
| Where the data is   | `shardlens-data/` beside the bot            | The collector's own database                       |
| To upgrade          | Comes with the bot's own dependencies       | Pull the collector's new image                     |
| Shardlens dashboard | On the bot's machine only                   | At the collector's own address                     |
| Suits               | Most bots: up to a few hundred servers      | Bigger bots, or a dashboard others open on the web |
| Costs               | About 350 to 550 MB more memory for the bot | A second service and a database                    |

Start inside the bot. Moving to a collector of your own later starts its history afresh, since Shardlens does not yet
move an embedded database across.

## 🏠 Inside the bot

The Shardlens collector runs in the bot's own process, on an in-process PostgreSQL in one folder. Its keys are made on
the first start and kept beside the database, so there is nothing to copy between services.

1. Set `SHARDLENS_EMBEDDED=true` in `.env` (or answer **Inside the bot** in `npm run setup`).
2. For who ran what, set `SHARDLENS_AUDIT_KEY` to 32 random bytes: `openssl rand -base64 32`. Keep a copy somewhere
   safe; the names it has recorded cannot be read without it. Leave it blank to keep everybody hashed.
3. Restart the bot. The start-up list's **Analytics** line says Shardlens is inside the bot, and **Usage → Setup** in
   the owner console ticks each step.

**Keep the folder.** The database and its keys are in `shardlens-data/<NODE_ENV>/`, beside `.env`, so a development
and a production bot on one machine never share one. It is gitignored. `docker-compose.yml` gives it a volume of its
own; on any other host, put it on storage that outlives a redeploy, or the history starts again each time.

**Its own dashboard** listens on `http://localhost:8080`, from the bot's machine only; `SHARDLENS_EMBEDDED_PORT`
moves it. Sign in with the `readKey` in `shardlens-data/<NODE_ENV>/secrets.json`. The owner console shows every
figure it does, so you only need it for Shardlens's own settings, alerts and reports.

**Upgrading** is upgrading the bot. `@shardlens/collector` is one of its dependencies, so a release that moves it ships
the new collector, which applies its database changes as it starts.

## 🛰️ A collector you run

For a bot past a few hundred servers, or a Shardlens dashboard others reach on the web, run the collector on its own.
Shardlens's CLI writes the whole deployment, Caddy for HTTPS and PostgreSQL included:

```bash
npx shardlens init --domain stats.example.com --app-id <your application ID> --identify-users
cd shardlens && docker compose up -d
```

`--identify-users` makes the audit key, so who ran what can be switched on. Then, in the bot's `.env`:

| Setting                  | From                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `SHARDLENS_URL`          | The `bot.env` that `init` wrote                                                             |
| `SHARDLENS_INGEST_KEY`   | The same `bot.env`                                                                          |
| `SHARDLENS_READ_KEY`     | `SHARDLENS_READ_KEY` in the collector's `.env`                                              |
| `SHARDLENS_ACTIVITY_KEY` | `npx shardlens keys --scope activity`, set on the collector too, or its Settings → API keys |

Turn on audit mode in the collector's **Settings → User identity**, or with `SHARDLENS_MODE=audit` in its `.env`.
`npx shardlens doctor`, run in the bot's folder, checks the address and the ingest key from outside the bot.

**Upgrading:** in the collector's folder, `docker compose pull && docker compose up -d`. Its image follows the `:1`
tag, so that brings in every 1.x release. Back up its database first; Shardlens's own upgrading guide has the rest.

## 🚄 On Railway

**Inside the bot** is the simple path on Railway, because there is no second service to keep in step:

1. In the bot service's **Variables**, set `SHARDLENS_EMBEDDED=true`, and `SHARDLENS_AUDIT_KEY` for who ran what.
2. Attach a volume to the bot service at `/app/shardlens-data`, so the history survives each deploy.
3. Set `RAILWAY_RUN_UID=0` on the bot service. Railway mounts a volume for root and the image runs as `node`, so
   without it the collector cannot write there and the log says so.

A push deploys the bot, and with it the collector, so an upgrade needs nothing more. The Shardlens dashboard listens
inside the container only; the owner console is where you read the figures.

**A collector of your own on Railway** follows Shardlens's own
[Railway guide](https://github.com/Kkkermit/Shardlens/blob/main/apps/docs/src/content/docs/self-hosting/railway.mdx):
a service built from a fork of Shardlens, a Railway PostgreSQL and its variables. Add `SHARDLENS_AUDIT_KEY` and
`SHARDLENS_ACTIVITY_KEY` there for who ran what. In the bot service, point at it with Railway's references, so each
key is written once:

```text
SHARDLENS_URL=https://${{Shardlens.RAILWAY_PUBLIC_DOMAIN}}
SHARDLENS_INGEST_KEY=${{Shardlens.SHARDLENS_INGEST_KEY}}
SHARDLENS_READ_KEY=${{Shardlens.SHARDLENS_READ_KEY}}
SHARDLENS_ACTIVITY_KEY=${{Shardlens.SHARDLENS_ACTIVITY_KEY}}
```

`Shardlens` is the collector service's name. Use its public HTTPS address, not Railway's private network: Shardlens
sends keys only over HTTPS, or plain HTTP to the same machine, so a `.railway.internal` address turns it off. To
upgrade that collector, sync your fork; Railway rebuilds on the push.

## ✅ Checking it works

- **Usage → Setup** in the owner console lists every step, ticked or with what to change: audit mode, the audit key,
  the activity key, events arriving and the bot's report of itself.
- **Runtime → Shardlens analytics** says where the bot sends, what is waiting and the last problem, with **Send now**.
- `/shardlens status` says the same in Discord, to the bot's owners only.

## 🧪 Trying it out

- **The console without a bot:** `npm run dashboard:fixtures` opens the dashboard on sample figures, signed in as an
  owner, so every Usage section can be looked at before anything is set up.
- **For real, on your machine:** set `SHARDLENS_EMBEDDED=true` in `.env.development`, run `npm run dev:all`, run a
  few commands in your test server, and open the owner console's **Usage** tab. The collector counts every minute,
  so figures appear within a couple of minutes.
- **Switching it off:** leave every `SHARDLENS_` setting blank and restart. The folder and the collector's figures
  stay where they were, so switching it back on finds them again.
