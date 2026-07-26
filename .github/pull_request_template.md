## What this changes

<!-- A sentence or two. Link the issue if there is one. -->

## Why

<!-- The problem this solves. -->

## How to verify

<!-- What a reviewer should run or click to see it working. -->

## Checklist

- [ ] `npm run check` passes
- [ ] Tests cover the new logic
- [ ] No read-modify-`save()` on numeric fields
- [ ] Embeds come from the `embed()` factory
- [ ] No raw `console.*`
- [ ] Every promise is awaited
- [ ] Timers are registered with the timer registry
- [ ] New custom IDs use the codec and a unique namespace
- [ ] New environment variables are in `src/config/env.ts` and `scripts/setupEnv.ts`
- [ ] Documentation updated if behaviour changed
