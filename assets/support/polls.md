---
id: polls
title: Running a poll
topic: community
keywords: poll, polls, vote, voting, survey, multiple choice, ask the server, opinion, choose
questions: How do I make a poll? | How do I run a vote? | Can people pick more than one answer? | How long does a poll last?
commands: poll
related: ideas
---
`/poll` posts one of Discord's own polls, which Discord counts and closes by itself.

- **Answers:** {fact:poll.minAnswers} to {fact:poll.maxAnswers}, separated by `|`, such as `/poll question:Pizza tonight? answers:Yes | No | Maybe`.
- **How long:** {fact:poll.defaultDuration} unless you say, and up to {fact:poll.maxDuration}, given in hours.
- **More than one answer:** turn on `multiple`.

You need the **Send Polls** permission in the channel, which Discord calls Create Polls, and so does {bot}. Nobody is pinged by the question.
