import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The handful of primitives every screen needs. shadcn's CLI copies richer versions of these into
 * `components/ui/` when they are wanted; these exist so the first screens are not blocked on that, and they read
 * the same design tokens.
 */

const VARIANTS = {
	primary: "bg-primary text-primary-foreground hover:bg-primary/90",
	secondary: "bg-muted text-foreground hover:bg-muted/70 border border-border",
	ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
	destructive: "bg-destructive text-white hover:bg-destructive/90",
} as const;

export function Button({
	variant = "primary",
	className,
	...props
}: ComponentPropsWithoutRef<"button"> & { variant?: keyof typeof VARIANTS }): React.JSX.Element {
	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-[0.625rem] px-4 py-2 text-sm font-medium",
				"transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
				VARIANTS[variant],
				className,
			)}
			{...props}
		/>
	);
}

/** No drop shadow anywhere: on near-black they read as smudges. Elevation is surface colour and a 1px border. */
export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">): React.JSX.Element {
	return <div className={cn("bg-card border-border rounded-[0.625rem] border p-6", className)} {...props} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
	return (
		<header className="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 className="text-2xl font-semibold">{title}</h1>
				{subtitle !== undefined && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
			</div>
			{action}
		</header>
	);
}

export function StatTile({ label, value }: { label: string; value: string }): React.JSX.Element {
	return (
		<Card className="p-4">
			<p className="text-muted-foreground text-[0.8125rem] font-medium">{label}</p>
			<p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
		</Card>
	);
}

/** An icon, one sentence naming what would be here, and the one action that fixes it. */
export function EmptyState({
	icon,
	title,
	body,
	action,
}: {
	icon: ReactNode;
	title: string;
	body: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-3 py-12 text-center">
			<div className="text-muted-foreground" aria-hidden="true">
				{icon}
			</div>
			<h2 className="font-semibold">{title}</h2>
			<p className="text-muted-foreground max-w-sm text-sm">{body}</p>
			{action}
		</div>
	);
}

/** Shaped like the real layout, so the page does not jump when the data arrives. */
export function Skeleton({ className }: { className?: string }): React.JSX.Element {
	return <div className={cn("bg-muted animate-pulse rounded-[0.625rem]", className)} aria-hidden="true" />;
}

export function Badge({ tone = "muted", children }: { tone?: "muted" | "success" | "warning"; children: ReactNode }) {
	const tones = {
		muted: "bg-muted text-muted-foreground",
		success: "bg-success/15 text-success",
		warning: "bg-warning/15 text-warning",
	} as const;

	return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

/**
 * A guild with no icon is common, and a broken image is the first thing anyone sees in the picker — so the
 * fallback is a lettered tile rather than an alt attribute.
 */
export function GuildIcon({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
	const style = { width: size, height: size };

	if (url === null) {
		return (
			<div
				className="bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-full text-sm font-semibold"
				style={style}
				aria-hidden="true"
			>
				{[...name][0]?.toUpperCase() ?? "?"}
			</div>
		);
	}

	return <img src={url} alt="" className="shrink-0 rounded-full" style={style} loading="lazy" />;
}
