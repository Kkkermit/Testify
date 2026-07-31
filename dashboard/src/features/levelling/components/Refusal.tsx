import { Warning } from "@/components/form";
import { ApiError } from "@/lib/api";

/** A refusal has to say why, or a control that snaps back looks like a bug rather than a permission. */
export function Refusal({ error }: { error: unknown }): React.JSX.Element | null {
	if (error === null || error === undefined) return null;

	const message = error instanceof ApiError ? error.message : "That change could not be saved.";
	return <Warning>{message}</Warning>;
}
