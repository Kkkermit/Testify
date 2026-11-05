import { Trans, useTranslation } from "react-i18next";
import { Card, SectionHeading, PAGE_TITLE } from "@/components/primitives";
import { usePageTitle } from "@/hooks/usePageTitle";

export function SetupNeeded({ missing, redirectUri }: { missing: string[]; redirectUri: string }): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("auth.finishSetup"));

	return (
		<main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
			<Card className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<SectionHeading>{t("auth.setup")}</SectionHeading>
					<h1 className={PAGE_TITLE}>{t("auth.almostThere")}</h1>
				</div>
				<p className="text-muted-foreground text-sm">
					<Trans i18nKey="auth.envBody" components={{ code: <code /> }} />
				</p>

				<ul className="flex flex-col gap-2">
					{missing.map((key) => (
						<li key={key} className="bg-muted rounded-field px-3 py-2 font-mono text-sm">
							{key}
						</li>
					))}
				</ul>

				{missing.includes("DASHBOARD_SESSION_SECRET") && (
					<p className="text-muted-foreground text-sm">
						<Trans i18nKey="auth.secretBody" components={{ code: <code className="text-foreground" /> }} />
					</p>
				)}

				<div>
					<p className="text-muted-foreground text-sm">{t("auth.redirectBody")}</p>
					<p className="bg-muted mt-2 rounded-field px-3 py-2 font-mono text-sm break-all">{redirectUri}</p>
				</div>
			</Card>
		</main>
	);
}
