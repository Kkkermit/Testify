import { NoticesCard } from "@/features/owner/components/NoticesCard";

/** Posting, changing and removing what everybody is told; the routes behind it answer only the bot's owners. */
export function NotificationsTab(): React.JSX.Element {
	return (
		<div className="flex flex-col gap-4">
			<NoticesCard />
		</div>
	);
}
