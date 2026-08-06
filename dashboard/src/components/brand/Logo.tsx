import { cn } from "@/lib/cn";

/** Inline, so it inherits `currentColor` and needs no request; a fork replaces this file and the favicon to rebrand. */
export function Logo({ size = 24, className }: { size?: number; className?: string }): React.JSX.Element {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 32 32"
			fill="none"
			aria-hidden="true"
			focusable="false"
			className={cn("shrink-0", className)}
		>
			<path
				d="M16 2.5 27 6.6v8.9c0 6.9-4.5 12-11 14.1-6.5-2.1-11-7.2-11-14.1V6.6L16 2.5Z"
				fill="currentColor"
				fillOpacity="0.14"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="m11 16.2 3.4 3.4 6.6-6.8"
				stroke="currentColor"
				strokeWidth="2.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** The mark on its tile, for anywhere it stands for the product rather than for a link. */
export function LogoTile({ size = 26, className }: { size?: number; className?: string }): React.JSX.Element {
	return (
		<span className={cn("bg-primary/15 text-accent rounded-card inline-flex p-2", className)}>
			<Logo size={size} />
		</span>
	);
}
