import { ChevronDown } from "lucide-react";
import { type ReactNode } from "react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { cn } from "@/lib/cn";

export function Disclosure({
	label,
	children,
	defaultOpen = true,
	className,
}: {
	label: string;
	children: ReactNode;
	defaultOpen?: boolean;
	className?: string;
}): React.JSX.Element {
	return (
		<details open={defaultOpen} className={cn("group", className)}>
			<summary className="marker:content-none flex cursor-pointer list-none items-center gap-2 py-1 select-none">
				<SectionHeading>{label}</SectionHeading>
				<ChevronDown
					size={14}
					aria-hidden="true"
					className="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-180"
				/>
			</summary>

			<div className="mt-3">{children}</div>
		</details>
	);
}
