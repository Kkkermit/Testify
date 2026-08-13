import { type ChannelSummary, type RoleSummary, VERIFY_LIMITS, verificationBlocked } from "@testify/shared";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { ChannelPicker, Field, FIELD, savingStateOf, SELECT, Toggle, Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { Section } from "@/features/settings/components/Section";
import { useSaveVerification, useVerification } from "@/features/settings/useVerification";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { markupWarning, sanitiseInput } from "@/lib/sanitise";

/** Posting the panel is its own button rather than a side effect of choosing a channel, because it is a message in a public channel. */
export function VerificationSection({
	guildId,
	channels,
	roles,
}: {
	guildId: string;
	channels: ChannelSummary[];
	roles: RoleSummary[];
}): React.JSX.Element {
	const config = useVerification(guildId);
	const save = useSaveVerification(guildId);
	const [draft, setDraft] = useState("");

	useEffect(() => {
		if (config.data !== undefined) setDraft(config.data.message);
	}, [config.data?.message]);

	const value = config.data;
	const blocked = value === undefined ? null : verificationBlocked(value);
	const dirty = value !== undefined && draft.trim() !== value.message;

	return (
		<Section
			icon={ShieldCheck}
			tint="text-feature-moderation"
			title="Verification"
			describes="A button new members press to prove they are there, and the role it hands them."
			saving={savingStateOf(save.isPending, save.isSuccess && !dirty)}
			failure={save.error}
		>
			{value === undefined ? (
				<p className="text-muted-foreground text-sm">Reading the current configuration…</p>
			) : (
				<>
					<Toggle
						label="Verify new members"
						hint="Off removes the configuration. The panel already posted stops working."
						checked={value.enabled}
						disabled={!value.enabled && blocked !== null}
						onChange={(enabled) => {
							save.mutate(enabled ? { publish: true } : { enabled: false });
						}}
					/>

					<ChannelPicker
						label="Show the Verify button in"
						hint="A channel new members can see before they have the role."
						channels={channels}
						value={value.channelId}
						allowNone={false}
						onChange={(channelId) => {
							save.mutate({ channelId });
						}}
					/>

					<Field label="Give them this role">
						<select
							className={SELECT}
							value={value.roleId ?? ""}
							onChange={(event) => {
								save.mutate({ roleId: event.target.value === "" ? null : event.target.value });
							}}
						>
							<option value="">No role chosen</option>
							{roles.map((role) => (
								<option key={role.id} value={role.id} disabled={!role.assignableByBot}>
									{role.name}
									{role.assignableByBot ? "" : " — Testify cannot give this out"}
								</option>
							))}
						</select>
					</Field>

					<Field label="What the panel says" htmlFor="verify-message">
						<textarea
							id="verify-message"
							rows={3}
							value={draft}
							maxLength={VERIFY_LIMITS.maxMessage}
							onChange={(event) => {
								setDraft(event.target.value);
							}}
							onBlur={() => {
								if (dirty && draft.trim() !== "") save.mutate({ message: sanitiseInput(draft) });
							}}
							className={cn(FIELD, "resize-y")}
						/>
					</Field>

					{markupWarning(draft) !== null && <Warning>{markupWarning(draft)}</Warning>}

					{value.roleTooHigh && (
						<Warning>
							That role sits at or above Testify&apos;s own, so Testify cannot give it to anybody. Move Testify&apos;s
							role higher in Server Settings → Roles, or pick a lower one.
						</Warning>
					)}

					{blocked !== null && <Warning>{blocked}</Warning>}

					{blocked === null && (
						<div className="flex flex-wrap items-center gap-3">
							<Button
								disabled={save.isPending}
								onClick={() => {
									save.mutate({ publish: true });
								}}
							>
								{value.posted ? "Update the posted panel" : "Post the panel"}
							</Button>
							<p className="text-muted-foreground text-sm tabular-nums">
								{value.posted ? `${value.verifiedCount.toLocaleString()} verified so far` : "Not posted yet"}
							</p>
						</div>
					)}

					{save.error !== null && (
						<Warning>{save.error instanceof ApiError ? save.error.message : "That change could not be saved."}</Warning>
					)}
				</>
			)}
		</Section>
	);
}
