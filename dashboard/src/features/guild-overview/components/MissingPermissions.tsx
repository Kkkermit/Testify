import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/primitives";

/** Configured features that will quietly do nothing are worth more than a badge, so this sits above the grid. */
export function MissingPermissions({ permissions }: { permissions: string[] }): React.JSX.Element | null {
	const { t } = useTranslation();
	if (permissions.length === 0) return null;

	return (
		<Card className="border-warning/40 motion-reveal flex flex-col gap-2">
			<h2 className="flex items-center gap-2 font-semibold">
				<AlertTriangle className="text-warning" size={18} aria-hidden="true" />
				{t("overview.missingTitle")}
			</h2>
			<p className="text-muted-foreground text-sm">{t("overview.missingBody")}</p>
			<ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
				{permissions.map((permission) => (
					<li key={permission}>{permission}</li>
				))}
			</ul>
		</Card>
	);
}
