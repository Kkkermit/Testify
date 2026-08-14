import { type LucideIcon } from "lucide-react";
import { type Theme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

/**
 * `data-scheme` makes every `light-dark()` token inside resolve to that theme, so a light sample is genuinely
 * light while the page around it stays dark. It is an attribute rather than an inline `color-scheme` because
 * the `light-dark()` polyfill only follows a scheme the stylesheet declared — see `index.css`.
 */
function Mock({ scheme }: { scheme: "light" | "dark" }): React.JSX.Element {
	return (
		<div data-scheme={scheme} className="bg-background flex h-full w-full gap-1 p-1.5">
			<div className="bg-card border-border flex w-1/4 flex-col gap-1 rounded-sm border p-1">
				<span className="bg-primary h-1 w-full rounded-full" />
				<span className="bg-muted h-1 w-3/4 rounded-full" />
				<span className="bg-muted h-1 w-2/3 rounded-full" />
			</div>
			<div className="flex flex-1 flex-col gap-1">
				<span className="bg-foreground/80 h-1.5 w-1/2 rounded-full" />
				<div className="bg-card border-border flex-1 rounded-sm border p-1">
					<span className="bg-accent block h-1 w-1/3 rounded-full" />
				</div>
			</div>
		</div>
	);
}

export function ThemePreview({
	theme,
	icon: Icon,
	label,
	selected,
}: {
	theme: Theme;
	icon: LucideIcon;
	label: string;
	selected: boolean;
}): React.JSX.Element {
	return (
		<figure className="flex flex-col gap-2">
			<div
				className={cn(
					"h-20 overflow-hidden rounded-lg border transition-colors duration-200",
					selected ? "border-primary ring-primary/30 ring-2" : "border-border",
				)}
			>
				{theme === "system" ? (
					// One mock with the other laid over it on a diagonal: "system" is not a look of its own, it is
					// whichever of the two the device is already asking for.
					<div className="relative h-full">
						<Mock scheme="light" />
						<div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,35%_100%)]">
							<Mock scheme="dark" />
						</div>
					</div>
				) : (
					<Mock scheme={theme} />
				)}
			</div>

			<figcaption className="text-muted-foreground flex items-center gap-2 text-xs">
				<Icon size={13} aria-hidden="true" />
				{label}
			</figcaption>
		</figure>
	);
}
