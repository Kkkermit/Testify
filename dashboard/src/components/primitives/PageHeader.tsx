import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { PAGE_TITLE } from "@/components/primitives/textStyles";
import { cn } from "@/lib/cn";

export function PageHeader({
	title,
	subtitle,
	server,
	back,
	action,
}: {
	title: string;
	subtitle?: string;
	server?: { id: string; name: string } | undefined;
	/** The page this one was opened from, so a phone without the sidebar has one tap back to it. */
	back?: { to: string; label: string };
	action?: ReactNode;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<header className="flex flex-wrap items-start justify-between gap-4">
			<div className="flex min-w-0 flex-col gap-2 wrap-anywhere">
				{server !== undefined && (
					<nav aria-label={t("nav.breadcrumb")} className="text-muted-foreground text-sm">
						<Link
							to={`/guilds/${server.id}`}
							className="hover:text-foreground underline-offset-4 transition-colors duration-150 hover:underline"
						>
							{server.name}
						</Link>
					</nav>
				)}
				<h1 className={PAGE_TITLE}>{title}</h1>
				{subtitle !== undefined && <p className="text-muted-foreground max-w-prose text-sm">{subtitle}</p>}
				{/* `min-h-6` carries it past the 24px WCAG 2.2 target minimum. */}
				{back !== undefined && (
					<Link
						to={back.to}
						className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground w-fit gap-1 text-sm")}
					>
						<ArrowLeft size={16} aria-hidden="true" /> {back.label}
					</Link>
				)}
			</div>
			{action}
		</header>
	);
}
