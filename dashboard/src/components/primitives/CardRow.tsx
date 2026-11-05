import { ChevronRight } from "lucide-react";

export const CARD_ROW = "flex items-center gap-3 transition-colors duration-150";

export function HoverChevron(): React.JSX.Element {
	return (
		<ChevronRight
			size={16}
			aria-hidden="true"
			className="text-muted-foreground shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
		/>
	);
}
