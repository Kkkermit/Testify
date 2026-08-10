import { type ReactNode } from "react";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export function PageHeader({
	title,
	subtitle,
	eyebrow,
	action,
}: {
	title: string;
	subtitle?: string;
	/** Which server this screen is about — the sidebar is a drawer on a phone, so the page has to say. */
	eyebrow?: string | undefined;
	action?: ReactNode;
}): React.JSX.Element {
	return (
		<header className="motion-reveal flex flex-wrap items-start justify-between gap-4">
			<div className="flex flex-col gap-2">
				{eyebrow !== undefined && <Eyebrow>{eyebrow}</Eyebrow>}
				<h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
				{subtitle !== undefined && <p className="text-muted-foreground max-w-prose text-sm">{subtitle}</p>}
			</div>
			{action}
		</header>
	);
}
