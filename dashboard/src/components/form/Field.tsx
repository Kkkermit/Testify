import { type ReactNode } from "react";
import { FIELD_GROUP, LABEL } from "@/components/form/field";
import { cn } from "@/lib/cn";

/** Every labelled control goes through this. Pass `htmlFor` when the control has its own id; omit it and the control is wrapped. */
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
