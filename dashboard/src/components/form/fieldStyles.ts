export const LABEL = "text-muted-foreground text-[0.8125rem] font-medium";

export const FIELD_GROUP = "flex min-w-0 flex-col gap-2";

export const FIELD =
	"bg-card border-border focus-visible:border-ring w-full rounded-field border px-3 py-2 text-sm outline-none transition-colors duration-150";

/** A complete `<select>`; the chevron room is a utility because base-layer padding loses to one. */
export const SELECT = `${FIELD} pr-9`;

export const SCROLL_LIST = "border-border max-h-56 overflow-y-auto rounded-field border";

export const CHECK_ROW = "flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150";
