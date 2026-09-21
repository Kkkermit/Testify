import { type ReactNode } from "react";
import { cardClass } from "@/components/primitives/Card";
import { CARD_HEADING } from "@/components/primitives/textStyles";

/** A named region rather than a plain card, so a fragment link can carry focus to one setting out of four. */
export function AppearanceCard({
	id,
	title,
	describes,
	children,
}: {
	id: string;
	title: string;
	describes: string;
	children: ReactNode;
}): React.JSX.Element {
	return (
		<section
			id={id}
			tabIndex={-1}
			aria-labelledby={`${id}-heading`}
			// Matching the `scroll-margin-top` `:focus-visible` already carries, or the sticky header on a phone
			// covers whichever setting was just scrolled to.
			className={cardClass("default", "scroll-mt-20 flex flex-col gap-4")}
		>
			<div>
				<h2 id={`${id}-heading`} className={CARD_HEADING}>
					{title}
				</h2>
				<p className="text-muted-foreground text-sm">{describes}</p>
			</div>

			{children}
		</section>
	);
}
