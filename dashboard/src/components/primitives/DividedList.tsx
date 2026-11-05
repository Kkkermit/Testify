import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function DividedList({ className, ...props }: ComponentPropsWithoutRef<"ul">): React.JSX.Element {
	return <ul className={cn("divide-border border-border rounded-field divide-y border", className)} {...props} />;
}
