import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** A bordered list whose rows are separated by a hairline rather than by a gap, so a run of them reads as one block. */
export function DividedList({ className, ...props }: ComponentPropsWithoutRef<"ul">): React.JSX.Element {
	return <ul className={cn("divide-border border-border rounded-field divide-y border", className)} {...props} />;
}
