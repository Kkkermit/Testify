import { ChevronRight } from "lucide-react";

/** A card whose whole surface is one row: a mark, a title block, and a control or a chevron on the right. */
export const CARD_ROW = "flex items-center gap-3 transition-colors duration-150";

/** The arrow on a row that navigates. It needs `group` on the row, which is what makes the whole card the target. */
export function HoverChevron(): React.JSX.Element {
	return (
		<ChevronRight
			size={16}
			aria-hidden="true"
			className="text-muted-foreground shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
		/>
	);
}
