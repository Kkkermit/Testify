/** One class string for every input, so a focus or border change happens in one place. */
export const FIELD =
	"bg-card border-border focus-visible:border-ring w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors duration-150";

/** The list boxes both pickers scroll; capped so a server with 200 roles cannot push the page off-screen. */
export const SCROLL_LIST = "border-border mt-2 max-h-56 overflow-y-auto rounded-lg border";

export const CHECK_ROW = "flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150";
