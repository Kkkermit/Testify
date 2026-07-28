# 04 — Target Design

How to build these patterns in TypeScript so they are reusable rather than copy-pasted.

Complements [`../migration/18-HELPERS-AND-UTILS.md`](../migration/18-HELPERS-AND-UTILS.md) (module APIs) and
[`../migration/11-TYPED-CONTRACTS.md`](../migration/11-TYPED-CONTRACTS.md) (the `ComponentHandler` interface).

---

## 1. Screens, not handlers

**The key insight:** a drill-down is a **stack of screens**, each a pure function from state to a rendered
message. The nav-row duplication between `shop.js` and `shopInteractions.js` exists precisely because no such
abstraction exists — the first render and every re-render are written separately.

```ts
// src/ui/screen.ts
export interface RenderContext {
  client: TestifyClient;
  user: User;
  guild: Guild;
}

export interface Screen<S> {
  render(state: S, ctx: RenderContext): Promise<RenderedScreen> | RenderedScreen;
}

export interface RenderedScreen {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}
```

```ts
// src/features/economy/screens/shopScreen.ts
export type ShopSection = 'items' | 'houses' | 'businesses' | 'jobs' | 'pets';

export interface ShopState {
  section: ShopSection;
  petRarity?: PetRarity;      // one level deeper, pets only
  selectedId?: string;        // detail view
}

export const shopScreen: Screen<ShopState> = {
  async render(state, ctx) {
    const account = await economyRepository.getOrCreateAccount(ctx.guild.id, ctx.user.id);

    if (state.selectedId) return renderDetail(state, account, ctx);
    if (state.petRarity)  return renderPetList(state, ctx);
    return renderCatalogue(state, account, ctx);
  },
};

function renderCatalogue(state: ShopState, account: EconomyAccount, ctx: RenderContext): RenderedScreen {
  return {
    embeds: [embed({
      category: Category.Economy,
      title: SECTION_TITLES[state.section],
      description: SECTION_BLURBS[state.section],
      fields: [{ name: 'Your Balance', value: formatBalance(account), inline: false }],
    })],
    components: [
      selectRow(Namespace.Shop, 'select', catalogueFor(state.section)),
      navRow(Namespace.Shop, state.section, SHOP_SECTIONS),   // ← defined ONCE
    ],
  };
}
```

**Both entry points now call the same function:**

```ts
// The command
async execute(ctx: CommandContext) {
  const state: ShopState = { section: ctx.options.getSubcommand() as ShopSection };
  await ctx.reply(await renderScreen(shopScreen, state, ctx));
}

// The component handler
async handle(ctx: ComponentContext, action: string, args: string[]) {
  const state = decodeShopState(action, args);
  await ctx.update(await renderScreen(shopScreen, state, ctx));
}
```

That single change removes the ~30 duplicated nav-row lines and makes it impossible for the two renders to
drift.

---

## 2. State lives in the custom ID

```ts
encodeId(Namespace.Shop, 'select', 'pets', 'legendary')   // "shop:select:pets:legendary"
encodeId(Namespace.Inv,  'page',   '3', userId)           // "inv:page:3:1234…"
encodeId(Namespace.Shop, 'buy',    'item', itemId)        // "shop:buy:item:sword_01"
```

**No module-scope `Map`s. No timers. No regex-parsing embed footers. No fetching surrounding messages.**
Survives restarts. The codec throws above Discord's 100-character limit.

Encode and decode as a pair, next to the screen:

```ts
// src/features/economy/screens/shopState.ts
export function encodeShopState(s: ShopState): string {
  return encodeId(Namespace.Shop, 'nav', s.section, s.petRarity ?? '', s.selectedId ?? '');
}
export function decodeShopState(action: string, args: string[]): ShopState {
  const [section, petRarity, selectedId] = args;
  return { section: section as ShopSection, petRarity: petRarity || undefined, selectedId: selectedId || undefined };
}
```

**When state genuinely cannot fit** — the heist lobby's participant list — persist it in Mongo keyed by a short
ID, not in memory. That also fixes orphaned heists surviving restarts, which the current in-memory
`client.activeHeists` map does not.

---

## 3. Declarative ownership

Replace nine hand-written comparisons (and ~18 missing ones) with a property the router enforces:

```ts
export const rehomeHandler: ComponentHandler = {
  namespace: Namespace.Pet,
  type: 'button',
  ownerOnly: true,                     // router compares against the ID embedded in the customId
  async handle(ctx, action, [petId]) { … },
};

export const heistHandler: ComponentHandler = {
  namespace: Namespace.Heist,
  type: 'button',
  access: {                            // per-action, for the participant/creator split
    join:   'anyone',
    start:  'creator',
    cancel: 'creator',
  },
  async handle(ctx, action, [heistId]) { … },
};

export const modPanelHandler: ComponentHandler = {
  namespace: Namespace.ModPanel,
  type: 'button',
  access: 'custom',                    // handler checks panelData.moderatorId itself
  async handle(ctx, action, args) { … },
};
```

Denial produces one consistent ephemeral message instead of the current per-handler variations.

---

## 4. Reusable builders

Added to `ui/components.ts`:

```ts
export function confirmRow(ns: Namespace, action: string, ...args: string[]): ActionRowBuilder;
export function backRow(ns: Namespace, target: string, ...args: string[]): ActionRowBuilder;
export function navRow(ns: Namespace, current: string, sections: readonly string[]): ActionRowBuilder;
export function selectRow<T>(ns: Namespace, action: string, items: T[],
  opts: { label: (t: T) => string; value: (t: T) => string;
          description?: (t: T) => string; emoji?: (t: T) => string }): ActionRowBuilder;
export function quickAmountRow(ns: Namespace, action: string, max: number): ActionRowBuilder;  // [25%][50%][All]
export function disableAll(rows: ActionRowBuilder[]): ActionRowBuilder[];
```

`navRow` marks the current section disabled automatically, so the active tab is visually obvious — something
the current shop does not do.

`disableAll` is what every expiring session should call, so dead buttons look dead.

---

## 5. One pagination implementation

Replaces three, all with different state-recovery bugs:

```ts
export interface PaginationOptions<T> {
  items: T[];
  pageSize: number;
  namespace: Namespace;
  ownerId?: string;
  render(pageItems: T[], page: number, totalPages: number): EmbedBuilder;
}

export function buildPage<T>(o: PaginationOptions<T>, page?: number): RenderedScreen;
export function createPaginationHandler<T>(o: PaginationOptions<T>): ComponentHandler;
```

Page number in the custom ID. No sessions, no timers, no footer parsing.

---

## 6. Modal forms

Generalises the mod panel's conditional field building — which is exactly how `/treasureconfig` and `/lottery`
should work:

```ts
export function modalForm(o: {
  ns: Namespace;
  action: string;
  args?: string[];
  title: string;
  fields: {
    id: string;
    label: string;
    style?: TextInputStyle;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
    value?: string;              // ← pre-fill with the CURRENT setting
  }[];
}): ModalBuilder;
```

**Pre-filling `value` with the current setting turns any config command into an editable form.** That is the
whole design of the settings panels in [`05-FEATURE-BLUEPRINTS.md`](05-FEATURE-BLUEPRINTS.md).

---

## 7. Where these live

Handlers sit **beside the commands that mint their IDs** — the co-location missing today, where `shop_*` is
minted in `commands/Economy/shop.js` and handled 883 lines away in
`events/EconCommandEvents/shopInteractions.js`.

```
src/features/economy/
  commands/      shop.ts  pet.ts  heist.ts  inventory.ts …
  components/    shopHandler.ts  petHandler.ts  heistHandler.ts …
  screens/       shopScreen.ts  shopState.ts  petScreen.ts …
  services/      purchase.ts  payout.ts  cooldowns.ts …
  index.ts       registers commands + component handlers together
```

The feature manifest registers both, so a namespace and its minting commands cannot be separated:

```ts
// src/features/economy/index.ts
export const economyFeature: Feature = {
  commands:   [shopCommand, petCommand, heistCommand, /* … */],
  components: [shopHandler, petHandler, heistHandler, /* … */],
  namespaces: [Namespace.Shop, Namespace.Pet, Namespace.Heist, Namespace.Inv, Namespace.Lottery, Namespace.Econ],
};
```

---

## 8. Testing

Screens are pure functions, so they test without Discord:

```ts
it('shows the pet catalogue with a back button one level deep', async () => {
  const rendered = await shopScreen.render({ section: 'pets', petRarity: 'legendary' }, mockRenderCtx());
  expect(rendered.components).toHaveLength(2);
  expect(customIdsOf(rendered)).toContain('shop:nav:pets');
});

it('round-trips shop state through the custom ID', () => {
  const state: ShopState = { section: 'pets', petRarity: 'rare' };
  expect(decodeShopState('nav', decodeId(encodeShopState(state)).args)).toEqual(state);
});
```

The round-trip test is the valuable one — it is what guarantees a rename cannot silently break a flow, which
is the failure mode the current string-literal approach invites. See
[`../migration/16-TESTING-STRATEGY.md`](../migration/16-TESTING-STRATEGY.md).
