import { Link } from "react-router";
import { Button, Card } from "@/components/common/primitives";
import { ApiError } from "@/lib/api";

/**
 * What failed, whether it is worth retrying, and one action. A 404 here means Testify is not in the server,
 * which is a different screen from "you cannot manage it" — and both are different from a bug.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }): React.JSX.Element {
	const { title, body, retryable } = describe(error);

	return (
		<Card className="flex flex-col items-start gap-3">
			<h1 className="text-lg font-semibold">{title}</h1>
			<p className="text-muted-foreground text-sm">{body}</p>
			<div className="flex gap-2">
				{retryable && onRetry !== undefined && (
					<Button onClick={onRetry} variant="secondary">
						Try again
					</Button>
				)}
				<Link
					to="/guilds"
					className="text-muted-foreground hover:text-foreground inline-flex items-center px-2 py-2 text-sm"
				>
					Back to servers
				</Link>
			</div>
		</Card>
	);
}

export function describe(error: unknown): { title: string; body: string; retryable: boolean } {
	if (!(error instanceof ApiError)) {
		return { title: "Something went wrong", body: "The dashboard could not reach the bot.", retryable: true };
	}

	switch (error.code) {
		case "guild_not_found":
			return {
				title: "Testify is not in that server",
				body: "Invite it back and this page will work again.",
				retryable: false,
			};
		case "missing_manage_guild":
			return {
				title: "You cannot manage that server",
				body: "You need the Manage Server permission there.",
				retryable: false,
			};
		case "not_a_member":
			return { title: "You are not in that server", body: "Rejoin it and try again.", retryable: false };
		case "rate_limited":
			return { title: "Too many requests", body: error.message, retryable: true };
		case "setup_required":
			return {
				title: "The dashboard is not configured",
				body: "Finish the setup steps on the sign-in page.",
				retryable: false,
			};
		default:
			return { title: "Something went wrong", body: error.message, retryable: error.status >= 500 };
	}
}
