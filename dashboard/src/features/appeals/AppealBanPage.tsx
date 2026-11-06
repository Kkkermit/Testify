import { APPEAL_LIMITS, type AppealableServer, type OwnAppeals } from "@testify/shared";
import { Scale, Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { Field, Refusal, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import {
	Avatar,
	Badge,
	Button,
	Card,
	cardClass,
	EmptyState,
	PageHeader,
	SectionHeading,
	Skeleton,
} from "@/components/primitives";
import { APPEAL_STATUS_LABEL, APPEAL_STATUS_TONE } from "@/features/appeals/components/AppealItem";
import { useOwnAppeals, useSendAppeal } from "@/features/appeals/useAppeals";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { dateAndTime, shortDate } from "@/lib/datetime";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

export function AppealBanPage(): React.JSX.Element {
	const { t } = useTranslation();
	const appeals = useOwnAppeals();

	usePageTitle(t("appeals.ownTitle"));

	return (
		<>
			<PageHeader title={t("appeals.ownTitle")} subtitle={t("appeals.ownSubtitle")} />
			{appeals.isError ? (
				<ErrorState as="h2" error={appeals.error} onRetry={() => void appeals.refetch()} />
			) : appeals.isPending ? (
				<Skeleton className="h-64 w-full" />
			) : (
				<AppealLists appeals={appeals.data} />
			)}
		</>
	);
}

function AppealLists({ appeals }: { appeals: OwnAppeals }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<>
			{appeals.servers.length === 0 ? (
				<Card>
					<EmptyState icon={<Scale size={28} />} title={t("appeals.ownNone")} body={t("appeals.ownNoneBody")} />
				</Card>
			) : (
				<ul className="flex flex-col gap-4">
					{appeals.servers.map((server) => (
						<ServerAppeal key={server.guildId} server={server} />
					))}
				</ul>
			)}

			{appeals.appeals.length > 0 && (
				<section aria-labelledby="appeal-history" className="flex flex-col gap-3">
					<SectionHeading as="h2" id="appeal-history" count={appeals.appeals.length}>
						{t("appeals.ownHistory")}
					</SectionHeading>
					<ul className="flex flex-col gap-3">
						{appeals.appeals.map((appeal) => (
							<li key={appeal.id} className={cardClass("compact", "flex flex-col gap-2")}>
								<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
									<h3 className="text-sm font-semibold">{appeal.guildName ?? t("appeals.ownServerGone")}</h3>
									<Badge tone={APPEAL_STATUS_TONE[appeal.status]}>{t(APPEAL_STATUS_LABEL[appeal.status])}</Badge>
								</div>
								<p className="text-muted-foreground text-xs">
									{t("appeals.ownSentOn", { when: shortDate(appeal.createdAt) })}
								</p>
								<p className="text-sm whitespace-pre-line [overflow-wrap:anywhere]">{appeal.text}</p>
								{appeal.reason !== "" && (
									<blockquote className="border-border border-l-2 pl-3 text-sm">{appeal.reason}</blockquote>
								)}
							</li>
						))}
					</ul>
				</section>
			)}
		</>
	);
}

function ServerAppeal({ server }: { server: AppealableServer }): React.JSX.Element {
	const { t } = useTranslation();
	const send = useSendAppeal();
	const [text, setText] = useState("");
	const id = `appeal-${server.guildId}`;
	const cleaned = sanitiseInput(text);
	const markup = markupWarning(text);
	const tooShort = cleaned.length < APPEAL_LIMITS.minText;

	return (
		<li className={cardClass("default", "flex flex-col gap-4")}>
			<div className="flex items-center gap-3">
				<Avatar name={server.name} url={server.iconUrl} seed={server.guildId} />
				<h2 className="min-w-0 text-base font-semibold [overflow-wrap:anywhere]">{server.name}</h2>
			</div>

			{server.open !== null ? (
				<div className="flex flex-col gap-2">
					<p className="text-sm">{t("appeals.ownWaiting", { when: dateAndTime(server.open.createdAt) })}</p>
					<blockquote className="border-border border-l-2 pl-3 text-sm whitespace-pre-line [overflow-wrap:anywhere]">
						{server.open.text}
					</blockquote>
				</div>
			) : server.againAt !== null ? (
				<p className="text-sm">{t("appeals.ownAgain", { when: dateAndTime(server.againAt) })}</p>
			) : (
				<form
					className="flex flex-col gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						send.mutate({ guildId: server.guildId, text: cleaned });
					}}
				>
					<Field
						label={t("appeals.ownWrite")}
						htmlFor={id}
						hint={t("appeals.ownWriteHint", { min: APPEAL_LIMITS.minText, max: APPEAL_LIMITS.maxText })}
					>
						<textarea
							id={id}
							rows={6}
							required
							value={text}
							maxLength={APPEAL_LIMITS.maxText}
							onChange={(event) => {
								setText(event.target.value);
							}}
							className={cn(FIELD, "resize-y")}
						/>
						<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
							{t("common.partOf", { part: text.length, whole: APPEAL_LIMITS.maxText })}
						</span>
					</Field>
					{markup !== null && <Warning>{markup}</Warning>}
					<Refusal error={send.error} />
					<Button type="submit" className="self-start" disabled={send.isPending || tooShort || markup !== null}>
						<Send size={15} aria-hidden="true" />
						{t("appeals.ownSend")}
					</Button>
				</form>
			)}
		</li>
	);
}
