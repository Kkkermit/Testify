import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = {
	primary: "bg-primary text-primary-foreground hover:bg-primary/90",
	secondary: "bg-muted text-foreground hover:bg-muted/70 border border-border",
	ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
	destructive: "bg-destructive text-white hover:bg-destructive/90",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function Button({
	variant = "primary",
	className,
	...props
}: ComponentPropsWithoutRef<"button"> & { variant?: ButtonVariant }): React.JSX.Element {
	return (
		<button
			type="button"
			// Readable from a test and a browser sweep, which is how "one primary per screen" is checked at all.
			data-variant={variant}
			className={cn(
				"inline-flex min-h-11 items-center justify-center gap-2 rounded-card px-4 py-2 text-sm font-medium",
				"transition-[background-color,color,transform] duration-150 ease-out",
				// A press that moves is the cheapest confirmation there is that the click landed.
				"active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
				VARIANTS[variant],
				className,
			)}
			{...props}
		/>
	);
}
