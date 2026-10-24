import { type SetupStep, type SetupStepState } from "@testify/shared";
import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Warning } from "@/components/form";
import { Badge, Button, Card } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { featureLook } from "@/config/features";
import {
	actionFor,
	describeStep,
	hideChecklist,
	isChecklistHidden,
	STEP_TITLE,
} from "@/features/guild-overview/setupChecklist.utils";
import { useRunSetupStep, useSetupChecklist } from "@/features/guild-overview/useSetupChecklist";
import { cn } from "@/lib/cn";

const LOOK_OF: Record<SetupStep, string> = { levelling: "levelling", welcome: "welcome", "audit-log": "audit-logging" };

/** One-click starters for what most servers turn on first; gone once all three are on, or when hidden. */
export function SetupChecklist({ guildId }: { guildId: string }): React.JSX.Element | null {
	const { t } = useTranslation();
	const checklist = useSetupChecklist(guildId);
	const run = useRunSetupStep(guildId);
	const [hidden, setHidden] = useState(() => isChecklistHidden(guildId));

	// Advice rather than state: if it cannot be read, the overview below says everything that matters.
	if (hidden || checklist.data === undefined) return null;

	const { steps } = checklist.data;
	const done = steps.filter((step) => step.done).length;
	if (done === steps.length) return null;

	const first = steps.find((step) => actionFor(step) === "start" || actionFor(step) === "create");

	return (
		<Card focal className="motion-reveal flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h2 id="checklist-heading" className="font-semibold">
						{t("checklist.title")}
					</h2>
					<p className="text-muted-foreground text-sm">
						{t("checklist.body")} {t("checklist.progress", { done, total: steps.length })}
					</p>
				</div>
				<Button
					variant="ghost"
					onClick={() => {
						hideChecklist(guildId);
						setHidden(true);
					}}
				>
					{t("checklist.hide")}
				</Button>
			</div>

			<ol aria-labelledby="checklist-heading" className="divide-border flex flex-col divide-y">
				{steps.map((step) => (
					<StepRow
						key={step.step}
						guildId={guildId}
						step={step}
						primary={step === first}
						pending={run.isPending && run.variables === step.step}
						busy={run.isPending}
						error={run.isError && run.variables === step.step ? run.error : null}
						onStart={() => {
							run.mutate(step.step);
						}}
					/>
				))}
			</ol>
		</Card>
	);
}

function StepRow({
	guildId,
	step,
	primary,
	pending,
	busy,
	error,
	onStart,
}: {
	guildId: string;
	step: SetupStepState;
	primary: boolean;
	pending: boolean;
	busy: boolean;
	error: Error | null;
	onStart: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const look = featureLook(LOOK_OF[step.step]);
	const Icon = step.done ? Check : look.icon;
	const action = actionFor(step);
	const screen = look.path?.(guildId) ?? `/guilds/${guildId}`;

	return (
		<li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
			<span
				aria-hidden="true"
				className={cn(
					"rounded-field flex size-9 shrink-0 items-center justify-center",
					step.done ? "bg-success/15 text-success" : cn(look.wash, look.tint),
				)}
			>
				<Icon size={18} />
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<p className="flex flex-wrap items-center gap-2 text-sm font-medium">
						{t(STEP_TITLE[step.step])}
						{step.done && <Badge tone="success">{t("checklist.on")}</Badge>}
					</p>
					<p className="text-muted-foreground text-sm">{t(describeStep(step), { channel: step.channelName ?? "" })}</p>
					{error !== null && <Warning>{error.message}</Warning>}
				</div>

				<div className="flex shrink-0 flex-wrap items-center gap-3">
					{(action === "start" || action === "create") && (
						<Button variant={primary ? "primary" : "secondary"} disabled={busy} onClick={onStart}>
							{pending ? t("checklist.starting") : t(action === "create" ? "checklist.create" : "checklist.start")}
						</Button>
					)}
					<Link to={screen} className={cn(INLINE_TARGET, "text-accent hover:text-foreground text-sm")}>
						{t(action === "choose" ? "checklist.choose" : step.done ? "checklist.open" : "checklist.customise")}
					</Link>
				</div>
			</div>
		</li>
	);
}
