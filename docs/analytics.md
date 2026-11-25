<div align="center">

# 📈 Analytics with Shardlens

**Which commands run, how they end and how long they take, read back in the owner console. Off until you switch it
on, and one setting when you do.**

[![Shardlens](https://img.shields.io/badge/Shardlens-1.3-8b5cf6?style=for-the-badge)](https://github.com/Kkkermit/Shardlens)
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

A refusal the bot explains to the person who ran the command, such as having no account yet, counts as a run rather
than a failure, so the failures it shows are the bot's own.

**Upgrading from a version that counted for itself.** Before Shardlens, the bot counted commands and dashboard screens
in its own database, and those counts expire 90 days after they were made. Until they have, the Usage tab adds them to
its figures and says how many runs it added, so switching Shardlens on does not start the console from nothing. Who ran
what before Shardlens is not carried over: it stays in the bot's database for its last 30 days and goes with it.

## 🧭 Choose how to run it

|                     | Inside the bot                                      | A collector you run                                |
| ------------------- | --------------------------------------------------- | -------------------------------------------------- |
| To set up           | `SHARDLENS_MONGODB=true`                            | A collector, a PostgreSQL and four settings        |
| Who ran what        | Add `SHARDLENS_AUDIT_KEY`                           | Audit mode on the collector, and an activity key   |
| Where the data is   | The bot's own MongoDB, in collections `shardlens_…` | The collector's own database                       |
| To upgrade          | Comes with the bot's own dependencies               | Pull the collector's new image                     |
| Shardlens dashboard | `npx shardlens dashboard` in the bot's folder       | At the collector's own address                     |
| Suits               | Every bot whose MongoDB is 7.0 or newer             | Bigger bots, or a dashboard others open on the web |
| Costs               | Space in the bot's database                         | A second service and a database                    |

Start inside the bot. Moving to a collector of your own later starts its history afresh, since Shardlens does not move
figures between MongoDB and PostgreSQL.

## 🏠 Inside the bot

The Shardlens collector runs in the bot's own process and keeps everything in the MongoDB the bot already uses, so
there is no second service, no folder to keep and no volume to pay for, and the history survives every redeploy. Its
keys are made on its first start and kept in the same database.

1. Set `SHARDLENS_MONGODB=true` in `.env` (or answer **Inside the bot** in `npm run setup`).
2. For who ran what, set `SHARDLENS_AUDIT_KEY` to 32 random bytes: `openssl rand -base64 32`. Keep a copy somewhere
   safe; the names it has recorded cannot be read without it, and it is never kept in the database. Leave it blank to
   keep everybody hashed.
3. Restart the bot. The start-up list's **Analytics** line says Shardlens is on the bot's MongoDB, and **Usage → Setup**
   in the owner console ticks each step.

**It needs MongoDB 7.0 or newer.** Atlas runs 8.0, its free tier included, and `docker-compose.yml` runs 8.

**Where it is kept.** Every collection it adds starts `shardlens_`, in the database `MONGODB_URI` names, or in one
called `shardlens` when it names none. Nothing of the bot's own is touched. Single events are kept 35 days, which
Shardlens's own **Settings → Data retention** changes (7 to 90); counts by hour and day stay small for years. The
dashboard's screens and servers in the owner console are read from single events, so they reach back only that far:
set it to 90 for them to cover the console's longest window. A command
takes about 150 bytes on disk: Atlas's free 512 MB, if Shardlens had it to itself, would hold roughly 30,000 commands a
day at 35 days, and the bot's own data shares it. It opens at most 10 connections of its own to the database. To remove it, switch it off and drop the `shardlens_`
collections.

**Its own dashboard** answers on `http://127.0.0.1:8080`, from the bot's machine only, which is where the owner
console reads every figure; `SHARDLENS_PORT` moves it. On the website's own port it moves itself one along and says so
at start-up, since it starts first and would otherwise leave the website none. To open Shardlens's own pages, for its settings, alerts and
reports, run this in the bot's folder on any computer whose `.env` has the bot's `MONGODB_URI`, and open the one-time
link it prints:

```bash
npx shardlens dashboard --port 8081
```

Add `--app-id <application ID>` when a development and a production bot share one database. To open it on the web
instead, run Shardlens's collector image anywhere with `DATABASE_URL` set to the same connection string; the bot keeps
writing its own events, and the image serves the dashboard.

**Upgrading** is upgrading the bot. `@shardlens/collector` is one of its dependencies, so a release that moves it ships
the new collector, which updates its collections as it starts.

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

**Inside the bot** is the simple path on Railway, because there is no second service to keep in step and nothing to
store but the bot's own database:

1. In the bot service's **Variables**, set `SHARDLENS_MONGODB=true`, and `SHARDLENS_AUDIT_KEY` for who ran what.
2. Check the bot's MongoDB is 7.0 or newer. Atlas is, its free tier included.

There is no volume to attach. A push deploys the bot, and with it the collector, so an upgrade needs nothing more. The
Shardlens dashboard answers inside the container only; the owner console is where you read the figures, and
`npx shardlens dashboard` on your own computer opens Shardlens's pages.

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
- **For real, on your machine:** set `SHARDLENS_MONGODB=true` in `.env.development`, run `npm run dev:all`, run a
  few commands in your test server, and open the owner console's **Usage** tab. The collector counts every minute,
  so figures appear within a couple of minutes.
- **Switching it off:** leave every `SHARDLENS_` setting blank and restart. The `shardlens_` collections stay where
  they were, so switching it back on finds them again.
