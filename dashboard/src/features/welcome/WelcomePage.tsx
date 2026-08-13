import { WELCOME_LIMITS, type WelcomeStyle } from "@testify/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, Field, FIELD, LABEL, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { Button, Card, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { PlaceholderHelp } from "@/features/welcome/components/PlaceholderHelp";
import { useUpdateWelcome, useWelcome } from "@/features/welcome/useWelcome";
import { insertToken, messageTooLong, STYLE_LABELS, STYLE_ORDER } from "@/features/welcome/welcome.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

export function WelcomePage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const config = useWelcome(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const update = useUpdateWelcome(guildId);

	usePageTitle(t("welcome.title"), overview.data?.name);

	const textarea = useRef<HTMLTextAreaElement>(null);
	const [draft, setDraft] = useState("");

	// The template is the one field that is edited rather than toggled, so it is held locally and saved on blur.
	useEffect(() => {
		if (config.data !== undefined) setDraft(config.data.message);
	}, [config.data?.message]);

	if (config.isPending) return <Skeleton className="h-96 w-full" />;
	if (config.isError) return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;

	const welcome = config.data;
	const dirty = draft !== welcome.message;
	const tooLong = messageTooLong(draft);
	// The stored record requires a channel, so the API refuses every write except "off" until there is one.
	const needsChannel = welcome.channelId === null;

	function saveMessage(): void {
		if (!dirty || tooLong || draft.trim() === "") return;
		update.mutate({ message: sanitiseInput(draft) });
	}

	return (
		<>
			<PageHeader eyebrow={overview.data?.name} title={t("welcome.title")} subtitle={t("welcome.subtitle")} />

			<Card className="motion-pop flex flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<Eyebrow as="h2">{t("welcome.greeting")}</Eyebrow>
					<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />
				</div>

				<ChannelPicker
					label={t("welcome.sendTo")}
					hint={t("welcome.sendToHint")}
					channels={channels.data ?? []}
					value={welcome.channelId}
					allowNone={false}
					onChange={(channelId) => {
						update.mutate({ channelId });
					}}
				/>

				{needsChannel && <Warning>{t("welcome.pickFirst")}</Warning>}

				<Toggle
					label={t("welcome.greet")}
					hint={t("welcome.greetHint")}
					checked={welcome.enabled}
					disabled={needsChannel}
					onChange={(enabled) => {
						update.mutate({ enabled });
					}}
				/>

				{/* A `<legend>` is not a flex item, so the gap under it has to be a margin on the group itself. */}
				<fieldset disabled={needsChannel}>
					<legend className={LABEL}>{t("welcome.sentAs")}</legend>
					<div className="mt-2 grid gap-2 sm:grid-cols-3">
						{STYLE_ORDER.map((style) => (
							<StyleChoice
								key={style}
								style={style}
								checked={welcome.style === style}
								disabled={needsChannel}
								onChange={() => {
									update.mutate({ style });
								}}
							/>
						))}
					</div>
				</fieldset>

				{/* The counter is a status, not part of the field's name, so it sits after the control. */}
				<Field label={t("welcome.message")} htmlFor="welcome-message">
					<textarea
						id="welcome-message"
						ref={textarea}
						rows={3}
						value={draft}
						disabled={needsChannel}
						onChange={(event) => {
							setDraft(event.target.value);
						}}
						onBlur={saveMessage}
						className={cn(FIELD, "resize-y font-mono", tooLong && "border-destructive")}
					/>
					<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
						{draft.length} of {WELCOME_LIMITS.maxMessage}
					</span>
				</Field>

				<PlaceholderHelp
					disabled={needsChannel}
					onInsert={(token) => {
						setDraft((current) => insertToken(current, token, textarea.current?.selectionStart ?? null));
						textarea.current?.focus();
					}}
				/>

				{markupWarning(draft) !== null && <Warning>{markupWarning(draft)}</Warning>}
				{tooLong && <Warning>{t("welcome.tooLong")}</Warning>}
				{dirty && !tooLong && (
					<div className="flex items-center gap-3">
						<Button onClick={saveMessage} disabled={draft.trim() === ""}>
							Save message
						</Button>
						<Button
							variant="ghost"
							onClick={() => {
								setDraft(welcome.message);
							}}
						>
							Discard
						</Button>
					</div>
				)}

				{update.error !== null && (
					<Warning>{update.error instanceof ApiError ? update.error.message : t("common.couldNotSave")}</Warning>
				)}
			</Card>

			<section aria-labelledby="preview-heading" className="flex flex-col gap-3">
				<Eyebrow as="h2" id="preview-heading">
					Preview
				</Eyebrow>
				<GreetingPreview
					message={draft}
					style={welcome.style}
					guildName={overview.data?.name ?? "this server"}
					memberCount={overview.data?.memberCount ?? 0}
				/>
			</section>
		</>
	);
}

function StyleChoice({
	style,
	checked,
	disabled,
	onChange,
}: {
	style: WelcomeStyle;
	checked: boolean;
	disabled: boolean;
	onChange: () => void;
}): React.JSX.Element {
	const { label, describes } = STYLE_LABELS[style];

	return (
		<label
			className={cn(
				"rounded-card flex flex-col gap-1 border p-3 transition-colors duration-150",
				disabled ? "border-border opacity-50" : "cursor-pointer",
				checked ? "border-primary bg-primary/10" : !disabled && "border-border hover:border-input",
			)}
		>
			<span className="flex items-center gap-2">
				<input type="radio" name="welcome-style" checked={checked} disabled={disabled} onChange={onChange} />
				<span className="text-sm font-medium">{label}</span>
			</span>
			<span className="text-muted-foreground text-xs">{describes}</span>
		</label>
	);
}
