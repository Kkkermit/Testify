import { fillTemplate, type WelcomeStyle } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { PostPreview } from "@/features/welcome/components/PostPreview";

export function GreetingPreview({
	message,
	style,
	guildName,
	memberCount,
	leaving = false,
}: {
	message: string;
	style: WelcomeStyle;
	guildName: string;
	memberCount: number;
	/** A goodbye is posted once they have gone, so the count is one fewer rather than one more. */
	leaving?: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const person = leaving ? "someone" : "newcomer";
	const filled = fillTemplate(message, {
		mention: `@${person}`,
		username: person,
		serverName: guildName,
		memberCount: leaving ? Math.max(0, memberCount - 1) : memberCount + 1,
	});

	return (
		<PostPreview text={filled} style={style}>
			{style === "card" && (
				<div className="bg-accent-wash mt-2 flex h-24 items-center justify-center rounded-field">
					<span className="text-muted-foreground text-xs">{t("welcome.cardAlt")}</span>
				</div>
			)}
		</PostPreview>
	);
}
