---
id: dashboard-changes-not-saving
title: A change on the dashboard did not save
topic: dashboard
keywords: not saving, did not save, change failed, error saving, refused, rate limited, too many requests, dashboard error, something went wrong, undo, deleted by mistake, came back, unsaved changes, leave without saving
questions: Why won't my change save? | The dashboard says something went wrong | Why was my change refused? | Can I undo a delete on the dashboard? | Why did something I deleted come back?
related: permissions, dashboard-overview, status-page
---
When the bot refuses a change, the reason appears beside the control you used.

### Common reasons
- **You no longer have Manage Server** in that server. Ask an admin, then reload.
- **Your session expired.** Sign in again and you return to the same page.
- **Too many requests.** Wait for the time the message gives, then try again.
- **The bot is missing a permission**, such as Manage Roles for a role it has to hand out. The overview page lists these.
- **A value is out of range**, such as a message that is too long. The message says which limit it hit.

### Deleting, and undoing it
Deleting a role menu, an idea, a sticky message or a giveaway shows **Undo** for a few seconds, and nothing is deleted until that has passed. If something you deleted comes back, the bot refused to delete it, and the notice says why.

### Leaving with changes unsaved
Audit logging, Tickets and the role menu form keep your changes until you press Save. Leaving with changes still unsaved asks first, so a stray click cannot lose them.

> **Tip:** If nothing loads at all, check the [status page](/status).
