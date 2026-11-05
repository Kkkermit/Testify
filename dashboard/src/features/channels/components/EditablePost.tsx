import { type TestPost, type WelcomePlaceholder, type WelcomeStyle } from "@testify/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Warning } from "@/components/form";
import { Button } from "@/components/primitives";
import { SendTest } from "@/features/test-post/SendTest";
import { GreetingPreview } from "@/features/welcome/components/GreetingPreview";
import { MessageEditor } from "@/features/welcome/components/MessageEditor";
import { ApiError } from "@/lib/api";

export function EditablePost({
	id,
	message,
	style = "text",
	leaving = false,
	guildName,
	memberCount,
	tokens,
	max,
	saving,
	error,
	testOf,
	onSave,
}: {
	id: string;
	message: string;
	style?: WelcomeStyle;
	leaving?: boolean;
	guildName: string;
	memberCount: number;
	tokens?: readonly WelcomePlaceholder[];
	max?: number;
	saving: boolean;
	error: Error | null;
	testOf: (message: string) => TestPost;
	onSave: (message: string, done: () => void) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(message);
	const preview = (
		<GreetingPreview
			message={editing ? draft : message}
			style={style}
			guildName={guildName}
			memberCount={memberCount}
			leaving={leaving}
		/>
	);

	if (!editing) {
		return (
			<div className="flex flex-col gap-3">
				{/* The button below is the control; clicking the preview itself is a shortcut to the same thing. */}
				<div
					className="hover:border-input cursor-text rounded-card"
					onClick={() => {
						setDraft(message);
						setEditing(true);
					}}
				>
					{preview}
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Button
						variant="secondary"
						onClick={() => {
							setDraft(message);
							setEditing(true);
						}}
					>
						{t("channel.editMessage")}
					</Button>
					<SendTest test={testOf(message)} />
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{preview}
			<MessageEditor
				id={id}
				label={t("channel.message")}
				saveLabel={t("common.save")}
				draft={draft}
				saved={message}
				disabled={saving}
				onDraft={setDraft}
				onSave={(next) => {
					onSave(next, () => {
						setEditing(false);
					});
				}}
				{...(tokens === undefined ? {} : { tokens })}
				{...(max === undefined ? {} : { max })}
			>
				<SendTest test={testOf(draft)} />
			</MessageEditor>
			{error !== null && <Warning>{error instanceof ApiError ? error.message : t("common.couldNotSave")}</Warning>}
			<Button
				variant="secondary"
				className="self-start"
				onClick={() => {
					setEditing(false);
				}}
			>
				{t("channel.doneEditing")}
			</Button>
		</div>
	);
}
