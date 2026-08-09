import { type ReactNode } from "react";
import { CARD_HEADING } from "@/components/primitives/textStyles";

/** An icon, one sentence naming what would be here, and the one action that fixes it. */
export function EmptyState({
	icon,
	title,
	body,
	action,
}: {
	icon: ReactNode;
	title: string;
	body: string;
	action?: ReactNode;
}): React.JSX.Element {
	return (
		<div className="motion-fade flex flex-col items-center gap-2.5 py-8 text-center">
			<div className="bg-muted text-muted-foreground rounded-full p-3" aria-hidden="true">
				{icon}
			</div>
			<h2 className={CARD_HEADING}>{title}</h2>
			<p className="text-muted-foreground max-w-sm text-sm">{body}</p>
			{action}
		</div>
	);
}
