import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PAGE_TITLE } from "@/components/primitives/textStyles";

export function PageHeader({
	title,
	subtitle,
	server,
	action,
}: {
	title: string;
	subtitle?: string;
	server?: { id: string; name: string } | undefined;
	action?: ReactNode;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<header className="flex flex-wrap items-start justify-between gap-4">
			<div className="flex flex-col gap-2">
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
			</div>
			{action}
		</header>
	);
}
