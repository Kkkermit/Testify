/** The name above a control, whatever element carries it. */
export const LABEL = "text-muted-foreground text-[0.8125rem] font-medium";

/** The wrapper `Field` puts a name and its control in, exported for the `<fieldset>` cases that cannot use `Field`. */
export const FIELD_GROUP = "flex min-w-0 flex-col gap-2";

/** One class string for every input, so a focus or border change happens in one place. */
export const FIELD =
	"bg-card border-border focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors duration-150";

/** Room for the chevron `index.css` draws, as a utility — a base-layer `padding-right` loses to one. */
export const SELECT = "pr-9";

/** The list boxes both pickers scroll; capped so a server with 200 roles cannot push the page off-screen. */
export const SCROLL_LIST = "border-border max-h-56 overflow-y-auto rounded-lg border";

export const CHECK_ROW = "flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150";
