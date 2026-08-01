import { WELCOME_LIMITS, type WelcomeStyle } from "@testify/shared";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { ChannelPicker, FIELD, SavingIndicator, savingStateOf, Toggle, Warning } from "@/components/form";
import { Button, Card, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels } from "@/features/levelling/useLevelling";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { PlaceholderHelp } from "@/features/welcome/components/PlaceholderHelp";
import { useUpdateWelcome, useWelcome } from "@/features/welcome/useWelcome";
import { insertToken, messageTooLong, STYLE_LABELS, STYLE_ORDER } from "@/features/welcome/welcome.utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

export function WelcomePage(): React.JSX.Element {
	const { guildId = "" } = useParams();

	const config = useWelcome(guildId);
	const channels = useChannels(guildId);
	const overview = useGuildOverview(guildId);
	const update = useUpdateWelcome(guildId);

	usePageTitle("Welcome messages", overview.data?.name);

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

	function saveMessage(): void {
		if (!dirty || tooLong || draft.trim() === "") return;
		update.mutate({ message: draft });
	}

	return (
		<>
			<PageHeader title="Welcome messages" subtitle="What Testify says when somebody joins, and where." />

			<Card className="motion-pop flex flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-lg font-semibold">Greeting</h2>
					<SavingIndicator state={savingStateOf(update.isPending, update.isSuccess)} />
				</div>

				<Toggle
					label="Greet new members"
					hint="Off means Testify says nothing when somebody joins. The message is kept."
					checked={welcome.enabled}
					onChange={(enabled) => {
						update.mutate({ enabled });
					}}
				/>

				<ChannelPicker
					label="Send the greeting to"
					channels={channels.data ?? []}
					value={welcome.channelId}
					allowNone={false}
					onChange={(channelId) => {
						update.mutate({ channelId });
					}}
				/>

				<fieldset className="flex flex-col gap-2">
					<legend className="text-muted-foreground text-[0.8125rem] font-medium">Sent as</legend>
					<div className="grid gap-2 sm:grid-cols-3">
						{STYLE_ORDER.map((style) => (
							<StyleChoice
								key={style}
								style={style}
								checked={welcome.style === style}
								onChange={() => {
									update.mutate({ style });
								}}
							/>
						))}
					</div>
				</fieldset>

				<div className="flex flex-col gap-2">
					{/* The counter is a status, not part of the field's name, so it sits outside the label. */}
					<label htmlFor="welcome-message" className="text-muted-foreground text-[0.8125rem] font-medium">
						Message
					</label>
					<textarea
						id="welcome-message"
						ref={textarea}
						rows={3}
						value={draft}
						onChange={(event) => {
							setDraft(event.target.value);
						}}
						onBlur={saveMessage}
						className={cn(FIELD, "resize-y font-mono", tooLong && "border-destructive")}
					/>
					<span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
						{draft.length} of {WELCOME_LIMITS.maxMessage}
					</span>
				</div>

				<PlaceholderHelp
					onInsert={(token) => {
						setDraft((current) => insertToken(current, token, textarea.current?.selectionStart ?? null));
						textarea.current?.focus();
					}}
				/>

				{tooLong && <Warning>That message is longer than Discord will accept. Shorten it before saving.</Warning>}
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
					<Warning>
						{update.error instanceof ApiError ? update.error.message : "That change could not be saved."}
					</Warning>
				)}
			</Card>

			<section aria-labelledby="preview-heading" className="flex flex-col gap-3">
				<h2 id="preview-heading" className="text-lg font-semibold">
					Preview
				</h2>
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
	onChange,
}: {
	style: WelcomeStyle;
	checked: boolean;
	onChange: () => void;
}): React.JSX.Element {
	const { label, describes } = STYLE_LABELS[style];

	return (
		<label
			className={cn(
				"rounded-card cursor-pointer border p-3 transition-colors duration-150",
				checked ? "border-primary bg-primary/10" : "border-border hover:border-input",
			)}
		>
			<span className="flex items-center gap-2">
				<input type="radio" name="welcome-style" checked={checked} onChange={onChange} />
				<span className="text-sm font-medium">{label}</span>
			</span>
			<span className="text-muted-foreground mt-1 block text-xs">{describes}</span>
		</label>
	);
}
