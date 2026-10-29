import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, PAGE_TITLE } from "@/components/primitives";
import { usePageTitle } from "@/hooks/usePageTitle";

/** A host serving only the website: there is nothing to sign in to, so the page says so and points at what is here. */
export function DashboardOff(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("site.offTitle"));

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
			<Card className="flex flex-col gap-3">
				<h1 className={PAGE_TITLE}>{t("site.offTitle")}</h1>
				<p className="text-muted-foreground text-sm">{t("site.offBody")}</p>
				<div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
					<Link to="/" className="text-accent underline underline-offset-2">
						{t("site.backHome")}
					</Link>
					<Link to="/docs/dashboard" className="text-accent underline underline-offset-2">
						{t("site.turnItOn")}
					</Link>
				</div>
			</Card>
		</main>
	);
}
