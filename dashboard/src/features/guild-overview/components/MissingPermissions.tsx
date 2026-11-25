import { type WatchedPermission } from "@testify/shared";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CARD_HEADING } from "@/components/primitives";
import { MISSING_LABELS } from "@/features/guild-overview/featureStatus.labels";
import { cn } from "@/lib/cn";

export function MissingPermissions({ permissions }: { permissions: WatchedPermission[] }): React.JSX.Element | null {
	const { t } = useTranslation();
	if (permissions.length === 0) return null;

	return (
		<Card className="border-warning/40 flex flex-col gap-2">
			<h2 className={cn(CARD_HEADING, "flex items-center gap-2")}>
				<AlertTriangle className="text-warning" size={18} aria-hidden="true" />
				{t("overview.missingTitle")}
			</h2>
			<p className="text-muted-foreground text-sm">{t("overview.missingBody")}</p>
			<ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
				{permissions.map((permission) => (
					<li key={permission}>{t(MISSING_LABELS[permission])}</li>
				))}
			</ul>
		</Card>
	);
}
