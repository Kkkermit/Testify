import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** No drop shadow anywhere: on near-black they read as smudges. Elevation is surface colour and a 1px border. */
export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">): React.JSX.Element {
	return (
		<div className={cn("bg-card border-border surface-edge rounded-[0.625rem] border p-6", className)} {...props} />
	);
}
