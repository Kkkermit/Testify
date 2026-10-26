import { type OpenTicket } from "@testify/shared";
import { Ticket } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Warning } from "@/components/form";
import { Badge, Button, Card, CARD_HEADING, DividedList, EmptyState, Skeleton } from "@/components/primitives";
import { useCloseTicket, useOpenTickets } from "@/features/tickets/useTickets";
import { ApiError } from "@/lib/api";
import { dateAndTime } from "@/lib/datetime";

/** Every ticket still open, who opened and claimed it, and Close, which files the transcript like the button. */
export function OpenTicketsCard({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const open = useOpenTickets(guildId, true);
	const close = useCloseTicket(guildId);

	return (
		<section aria-labelledby="open-tickets-heading">
			<Card className="flex flex-col gap-4">
				<div>
					<h2 id="open-tickets-heading" className={CARD_HEADING}>
						{t("tickets.openTitle")}
					</h2>
					<p className="text-muted-foreground text-sm">
						{open.data?.canClose === false ? t("tickets.openStaffOnly") : t("tickets.openBody")}
					</p>
				</div>

				{open.isError ? (
					<ErrorState as="h2" error={open.error} onRetry={() => void open.refetch()} />
				) : open.data === undefined ? (
					<Skeleton className="h-32 w-full" />
				) : open.data.tickets.length === 0 ? (
					<EmptyState icon={<Ticket size={28} />} title={t("tickets.noneOpen")} body={t("tickets.noneOpenBody")} />
				) : (
					<DividedList>
						{open.data.tickets.map((ticket) => (
							<TicketRow
								key={ticket.channelId}
								guildId={guildId}
								ticket={ticket}
								canClose={open.data.canClose}
								busy={close.isPending}
								onClose={() => {
									close.mutate(ticket.channelId);
								}}
							/>
						))}
					</DividedList>
				)}

				{close.error !== null && (
					<Warning>{close.error instanceof ApiError ? close.error.message : t("common.couldNotSave")}</Warning>
				)}
			</Card>
		</section>
	);
}

function TicketRow({
	guildId,
	ticket,
	canClose,
	busy,
	onClose,
}: {
	guildId: string;
	ticket: OpenTicket;
	canClose: boolean;
	busy: boolean;
	onClose: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [confirming, setConfirming] = useState(false);
	const name = ticket.channelName ?? ticket.ticketId;

	return (
		<li className="flex flex-col gap-2 px-4 py-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm font-medium">#{name}</span>
						{ticket.isLocked && <Badge tone="warning">{t("tickets.lockedBadge")}</Badge>}
						{ticket.claimedByName === null ? (
							<Badge>{t("tickets.unclaimed")}</Badge>
						) : (
							<Badge tone="success">{t("tickets.claimedBy", { name: ticket.claimedByName })}</Badge>
						)}
					</div>
					<p className="text-muted-foreground text-xs">
						<Link
							to={`/guilds/${guildId}/members/${ticket.ownerId}`}
							className="hover:text-foreground transition-colors duration-150"
						>
							{ticket.ownerName}
						</Link>{" "}
						· {t("tickets.opened", { when: dateAndTime(ticket.openedAt) })}
					</p>
				</div>
				{canClose && !confirming && (
					<Button
						variant="secondary"
						disabled={busy}
						aria-label={t("tickets.closeName", { name })}
						onClick={() => {
							setConfirming(true);
						}}
					>
						{t("tickets.close")}
					</Button>
				)}
			</div>

			{confirming && (
				<div className="border-destructive/40 flex flex-col gap-3 rounded-field border p-3">
					<p className="text-sm">{t("tickets.closeWarning", { name })}</p>
					<div className="flex flex-wrap gap-3">
						<Button
							variant="destructive"
							disabled={busy}
							onClick={() => {
								setConfirming(false);
								onClose();
							}}
						>
							{t("tickets.closeConfirm")}
						</Button>
						<Button
							variant="ghost"
							onClick={() => {
								setConfirming(false);
							}}
						>
							{t("common.cancel")}
						</Button>
					</div>
				</div>
			)}
		</li>
	);
}
