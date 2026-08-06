/**
 * The name above a control, whatever element carries it — a `<label>`, a `<legend>`, or a `<span>` inside a
 * wrapping label. One string, so the type scale is not restated at fifteen call sites.
 */
export const LABEL = "text-muted-foreground text-[0.8125rem] font-medium";

/**
 * The wrapper `Field` puts a name and its control in. Exported for the two places that cannot use `Field` —
 * a `<fieldset>`, which names a set rather than a control — so the spacing is still written once.
 */
export const FIELD_GROUP = "flex min-w-0 flex-col gap-2";

/** One class string for every input, so a focus or border change happens in one place. */
export const FIELD =
	"bg-card border-border focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors duration-150";

/**
 * A select carries its own chevron as a background image, and a Tailwind utility beats the base-layer padding
 * that would otherwise keep the longest option clear of it — so the room for it is reserved here.
 */
export const SELECT = "pr-9";

/** The list boxes both pickers scroll; capped so a server with 200 roles cannot push the page off-screen. */
export const SCROLL_LIST = "border-border max-h-56 overflow-y-auto rounded-lg border";

export const CHECK_ROW = "flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150";
