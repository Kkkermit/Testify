import { type MemberSoftban } from "@testify/shared";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Card } from "@/components/primitives";
import { dateAndTime } from "@/lib/datetime";

export function SoftbanCard({
	softban,
	busy,
	onLift,
}: {
	softban: MemberSoftban;
	busy: boolean;
	onLift: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card className="flex flex-wrap items-end justify-between gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="flex items-center gap-2 text-base font-semibold">
					<ShieldAlert size={18} className="text-destructive-text" aria-hidden="true" /> {t("members.activeSoftban")}
				</h2>
				<p className="text-muted-foreground text-sm">{softban.reason}</p>
				<p className="text-muted-foreground text-xs">
					{t("members.lifts")} <time dateTime={softban.expiresAt}>{dateAndTime(softban.expiresAt)}</time>
				</p>
			</div>

			{/* Not behind the hierarchy check: a softbanned user is banned, so they have no roles to compare. */}
			<Button variant="secondary" disabled={busy} onClick={onLift}>
				{t("members.liftNow")}
			</Button>
		</Card>
	);
}
