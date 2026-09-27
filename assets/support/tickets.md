---
id: tickets
title: Setting up tickets
topic: setup
keywords: tickets, ticket, support ticket, contact staff, help desk, ticket panel, transcripts, open ticket, modmail, explainer
questions: How do I set up tickets? | How do members contact staff? | How do I make a ticket panel?
commands: ticket
related: tickets-for-staff
---
Tickets give members a button that opens a private channel with your staff.

### In Discord
Run `/ticket setup`, which asks for four things:
1. **panel-channel**: where the button is posted.
2. **category**: where new ticket channels are created.
3. **transcripts**: where a closed ticket's transcript is sent.
4. **staff-role**: the role that can see and handle every ticket.

You can also set the panel's message and the button's wording.

### On the dashboard
Open your server, then **Tickets** under Channels. Choose the four destinations, then publish the panel.

`/ticket status` shows the setup, and `/ticket disable` turns tickets off. Open ticket channels are left alone, and the panel message has to be deleted by hand.
