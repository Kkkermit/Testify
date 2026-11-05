import { type ChangeRestore, stillAsLeft } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { RESTORE_SCREENS } from "@/features/changes/restore.labels";
import { restoreLines } from "@/features/changes/restore.utils";
import { useCurrentSetting, usePutBack } from "@/features/changes/useRestore";
import { useChannels, useRoles } from "@/features/levelling/useLevelling";
import { ApiError } from "@/lib/api";

export function RestorePanel({
	id,
	guildId,
	restore,
	onClose,
	onDone,
}: {
	id: string;
	guildId: string;
	restore: ChangeRestore;
	onClose: () => void;
	onDone: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const current = useCurrentSetting(guildId, restore, true);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const putBack = usePutBack(guildId);

	const frame = "bg-muted/40 rounded-field flex flex-col items-start gap-3 p-4 text-sm";

	if (current.isError) {
		return (
			<div id={id} className={frame}>
				<Warning>{t("restore.couldNotRead")}</Warning>
				<Button variant="secondary" onClick={() => void current.refetch()}>
					{t("common.tryAgain")}
				</Button>
			</div>
		);
	}

	if (current.isPending) {
		return (
			<p id={id} role="status" className={`${frame} text-muted-foreground`}>
				{t("restore.reading")}
			</p>
		);
	}

	if (!stillAsLeft(restore, current.data)) {
		return (
			<div id={id} className={frame}>
				<Warning>{t("restore.changedSince")}</Warning>
				<Link to={`/guilds/${guildId}${RESTORE_SCREENS[restore.action]}`} className="text-accent underline">
					{t("restore.openPage")}
				</Link>
			</div>
		);
	}

	const lines = restoreLines(restore, { channels: channels.data ?? [], roles: roles.data ?? [], t });

	return (
		<div id={id} className={frame}>
			<p>{t("restore.explain")}</p>
			<dl className="grid w-full gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
				{lines.map((line) => (
					<div key={line.field} className="contents">
						<dt className="font-medium">{line.label}</dt>
						<dd className="flex min-w-0 flex-col gap-1 break-words">
							<span className="text-muted-foreground">{t("restore.now", { value: line.now })}</span>
							<span>{t("restore.backTo", { value: line.back })}</span>
						</dd>
					</div>
				))}
			</dl>
			{putBack.error !== null && (
				<Warning>{putBack.error instanceof ApiError ? putBack.error.message : t("common.couldNotSave")}</Warning>
			)}
			<div className="flex flex-wrap gap-3">
				<Button
					disabled={putBack.isPending}
					onClick={() => {
						putBack.mutate(restore, { onSuccess: onDone });
					}}
				>
					{putBack.isPending ? t("restore.putting") : t("restore.confirm")}
				</Button>
				<Button variant="secondary" onClick={onClose}>
					{t("common.cancel")}
				</Button>
			</div>
		</div>
	);
}
