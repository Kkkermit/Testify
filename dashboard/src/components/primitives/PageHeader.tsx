import { type ReactNode } from "react";

export function PageHeader({
	title,
	subtitle,
	action,
}: {
	title: string;
	subtitle?: string;
	action?: ReactNode;
}): React.JSX.Element {
	return (
		<header className="motion-reveal mb-6 flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				{subtitle !== undefined && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
			</div>
			{action}
		</header>
	);
}
