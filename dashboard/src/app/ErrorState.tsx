import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button, Card } from "@/components/primitives";
import { ApiError } from "@/lib/api";

/** A 404 here means Testify is not in the server, which is a different screen from both a refusal and a bug. */
export function ErrorState({
	error,
	onRetry,
	as: Heading = "h1",
}: {
	error: unknown;
	onRetry?: () => void;
	/** `h2` when it replaces one panel of a screen that still has its own `<h1>`, such as an owner console tab. */
	as?: "h1" | "h2";
}): React.JSX.Element {
	const { t } = useTranslation();
	const { title, body, retryable } = describe(error, t);

	return (
		<Card className="flex flex-col items-start gap-3">
			<Heading className="text-lg font-semibold">{title}</Heading>
			<p className="text-muted-foreground text-sm">{body}</p>
			<div className="flex gap-2">
				{retryable && onRetry !== undefined && (
					<Button onClick={onRetry} variant="secondary">
						{t("common.retry")}
					</Button>
				)}
				<Link
					to="/guilds"
					className="text-muted-foreground hover:text-foreground inline-flex items-center px-2 py-2 text-sm"
				>
					{t("error.backToServers")}
				</Link>
			</div>
		</Card>
	);
}

/**
 * Takes the translator rather than returning keys, so this stays one function whose output is what the reader
 * sees — and its tests can keep asserting on the sentence rather than on a key nobody reads.
 */
export function describe(error: unknown, t: TFunction): { title: string; body: string; retryable: boolean } {
	if (!(error instanceof ApiError)) {
		return { title: t("error.unreachableTitle"), body: t("error.unreachableBody"), retryable: true };
	}

	switch (error.code) {
		case "guild_not_found":
			return { title: t("error.botLeftTitle"), body: t("error.botLeftBody"), retryable: false };
		case "missing_manage_guild":
			return { title: t("error.cannotManageTitle"), body: t("error.cannotManageBody"), retryable: false };
		case "not_a_member":
			return { title: t("error.notAMemberTitle"), body: t("error.notAMemberBody"), retryable: false };
		// The server's own wording says when to come back, and repeating it beats replacing it.
		case "rate_limited":
			return { title: t("error.rateLimitedTitle"), body: error.message, retryable: true };
		case "setup_required":
			return { title: t("error.setupRequiredTitle"), body: t("error.setupRequiredBody"), retryable: false };
		default:
			return { title: t("error.unreachableTitle"), body: error.message, retryable: error.status >= 500 };
	}
}
