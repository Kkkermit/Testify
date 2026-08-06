import { type ReactNode } from "react";
import { FIELD_GROUP, LABEL } from "@/components/form/field";
import { cn } from "@/lib/cn";

/**
 * A control with its name, and its hint, above it.
 *
 * Every labelled control goes through this, so the distance between a name and its box is one number rather
 * than a `mt-1` on one card and a `gap-2` on the next — which is what made a page of them read as unaligned.
 *
 * Pass `htmlFor` when the control carries its own id and this becomes a sibling label; omit it and the control
 * is wrapped, which labels it implicitly.
 */
export function Field({
	label,
	hint,
	htmlFor,
	className,
	children,
}: {
	label: ReactNode;
	hint?: ReactNode;
	htmlFor?: string;
	className?: string;
	children: ReactNode;
}): React.JSX.Element {
	const name = (
		<>
			<span className={LABEL}>{label}</span>
			{hint !== undefined && <span className="text-muted-foreground text-xs">{hint}</span>}
		</>
	);

	if (htmlFor !== undefined) {
		return (
			<div className={cn(FIELD_GROUP, className)}>
				<label htmlFor={htmlFor} className="flex flex-col gap-0.5">
					{name}
				</label>
				{children}
			</div>
		);
	}

	return (
		<label className={cn(FIELD_GROUP, className)}>
			<span className="flex flex-col gap-0.5">{name}</span>
			{children}
		</label>
	);
}
