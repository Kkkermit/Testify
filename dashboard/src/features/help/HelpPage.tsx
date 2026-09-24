import { BookOpen, Code2, ExternalLink, MessageCircleQuestion, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, CARD_HEADING, DataList, DividedList, PageHeader } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useBot } from "@/features/auth/useBot";
import { useMe } from "@/features/auth/useMe";
import { AskCard } from "@/features/help/components/AskCard";
import { helpAreas } from "@/features/help/help.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { BUILT_IN_BOT_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

const LINK = cn(INLINE_TARGET, "text-accent hover:text-foreground gap-1 text-sm");

/** The first screen a new admin should read: what to do first, how commands work, and what every area is for. */
export function HelpPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("help.title"));

	const me = useMe();
	const bot = useBot();
	const areas = helpAreas(me.data?.isOwner === true);
	const name = bot.data?.name ?? BUILT_IN_BOT_NAME;

	return (
		<>
			<PageHeader title={t("help.title")} subtitle={t("help.subtitle", { name })} />

			<AskCard name={name} />

			<Card className="flex flex-col gap-4">
				<h2 className={CARD_HEADING}>{t("help.firstSteps")}</h2>

				<ol className="flex flex-col gap-4">
					<Step number={1} title={t("help.inviteTitle")} body={t("help.inviteBody", { name })}>
						<Link to="/guilds" className={LINK}>
							{t("help.toServers")}
						</Link>
					</Step>
					<Step number={2} title={t("help.pickTitle")} body={t("help.pickBody")} />
					<Step number={3} title={t("help.configureTitle")} body={t("help.configureBody")} />
					<Step number={4} title={t("help.tellTitle")} body={t("help.tellBody")}>
						<Link to="/commands" className={LINK}>
							{t("help.toCommands")}
						</Link>
					</Step>
				</ol>
			</Card>

			<Card className="flex flex-col gap-4">
				<div className="flex items-center gap-2">
					<Terminal size={18} aria-hidden="true" className="text-accent shrink-0" />
					<h2 className={CARD_HEADING}>{t("help.commandsTitle")}</h2>
				</div>

				<DataList
					dense
					rows={[
						{ label: t("help.slashTerm"), value: t("help.slashDetail") },
						{ label: t("help.prefixTerm"), value: t("help.prefixDetail") },
						{ label: t("help.switchTerm"), value: t("help.switchDetail") },
					]}
					className="gap-3"
				/>

				<Link to="/commands" className={LINK}>
					{t("help.browseCommands")}
				</Link>
			</Card>

			<section aria-labelledby="help-tour" className="flex flex-col gap-3">
				<div className="flex flex-col gap-1">
					<h2 id="help-tour" className={CARD_HEADING}>
						{t("help.tourTitle")}
					</h2>
					<p className="text-muted-foreground text-sm">{t("help.tourSubtitle")}</p>
				</div>

				<DividedList>
					{areas.map((area) => (
						<li key={area.labelKey} className="flex items-center gap-3 px-3 py-2">
							<area.icon size={16} aria-hidden="true" className="text-muted-foreground shrink-0" />
							<span className="min-w-0">
								<span className="block text-sm font-medium">{t(area.labelKey)}</span>
								{area.hintKey !== undefined && (
									<span className="text-muted-foreground block text-xs">{t(area.hintKey)}</span>
								)}
							</span>
						</li>
					))}
				</DividedList>
			</section>

			<Card className="flex flex-col gap-4">
				<div className="flex items-center gap-2">
					<MessageCircleQuestion size={18} aria-hidden="true" className="text-accent shrink-0" />
					<h2 className={CARD_HEADING}>{t("help.stuckTitle")}</h2>
				</div>
				<p className="text-muted-foreground text-sm">{t("help.stuckBody")}</p>

				<div className="flex flex-wrap gap-4">
					{bot.data !== undefined && (
						<>
							<a href={bot.data.supportUrl} target="_blank" rel="noreferrer" className={LINK}>
								<BookOpen size={15} aria-hidden="true" />
								{t("help.supportServer")}
								<ExternalLink size={13} aria-hidden="true" />
							</a>
							<a href={bot.data.repositoryUrl} target="_blank" rel="noreferrer" className={LINK}>
								<Code2 size={15} aria-hidden="true" />
								{t("help.sourceCode")}
								<ExternalLink size={13} aria-hidden="true" />
							</a>
						</>
					)}
				</div>
			</Card>
		</>
	);
}

function Step({
	number,
	title,
	body,
	children,
}: {
	number: number;
	title: string;
	body: string;
	children?: React.ReactNode;
}): React.JSX.Element {
	return (
		<li className="flex gap-3">
			<span
				aria-hidden="true"
				className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
			>
				{number}
			</span>
			<span className="flex min-w-0 flex-col gap-1">
				<span className="text-sm font-medium">{title}</span>
				<span className="text-muted-foreground text-sm">{body}</span>
				{children}
			</span>
		</li>
	);
}
