import { Ban, ShieldOff, UserX } from "lucide-react";
import { useState } from "react";
import { FIELD, Field, Warning } from "@/components/form";
import { Avatar, Button, Card, EmptyState, Skeleton } from "@/components/primitives";
import { isSnowflake } from "@/features/owner/owner.utils";
import { useBlacklist, useBlockUser, useUnblockUser } from "@/features/owner/useBlacklist";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * The bot-wide block list. It is an id rather than a picker on purpose: somebody worth blocking is usually not
 * in a server the bot can still see, so there is no list to choose them from.
 */
export function BlacklistTab(): React.JSX.Element {
	const rows = useBlacklist();
	const block = useBlockUser();
	const unblock = useUnblockUser();

	const [userId, setUserId] = useState("");
	const [reason, setReason] = useState("");

	const failure = block.error ?? unblock.error;
	const busy = block.isPending || unblock.isPending;

	function submit(): void {
		block.mutate(
			{ userId, reason },
			{
				onSuccess: () => {
					setUserId("");
					setReason("");
				},
			},
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<Card className="flex flex-col gap-4">
				<div>
					<h2 className="font-display text-base font-bold tracking-tight">Block someone from Testify</h2>
					<p className="text-muted-foreground text-sm">
						A blocked account cannot run a command in any server, on either the slash or the prefix surface. This is
						bot-wide — for one server, turn the command off instead.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-[minmax(0,20rem)_1fr]">
					<Field htmlFor="blacklist-user" label="User ID">
						<input
							id="blacklist-user"
							value={userId}
							inputMode="numeric"
							autoComplete="off"
							placeholder="100000000000000000"
							onChange={(event) => {
								setUserId(event.target.value.trim());
							}}
							className={cn(FIELD, "font-mono")}
						/>
					</Field>

					<Field htmlFor="blacklist-reason" label="Reason (optional)">
						<input
							id="blacklist-reason"
							value={reason}
							autoComplete="off"
							maxLength={200}
							placeholder="Why they are being blocked"
							onChange={(event) => {
								setReason(event.target.value);
							}}
							className={FIELD}
						/>
					</Field>
				</div>

				<div className="flex items-center gap-3">
					<Button variant="destructive" disabled={!isSnowflake(userId) || busy} onClick={submit}>
						<Ban size={15} aria-hidden="true" />
						Block them
					</Button>
					{userId !== "" && !isSnowflake(userId) && (
						<p className="text-muted-foreground text-sm">A user ID is 17 to 20 digits.</p>
					)}
				</div>

				{failure !== null && (
					<Warning>{failure instanceof ApiError ? failure.message : "That could not be saved."}</Warning>
				)}
			</Card>

			<Card className="flex flex-col gap-4">
				<h2 className="font-display text-base font-bold tracking-tight">
					Blocked accounts {rows.data && `(${String(rows.data.length)})`}
				</h2>

				{rows.isPending && <Skeleton className="h-24 w-full" />}

				{rows.data?.length === 0 && (
					<EmptyState
						icon={<ShieldOff size={20} aria-hidden="true" />}
						title="Nobody is blocked"
						body="Anyone blocked here is refused before a command runs, in every server."
					/>
				)}

				{rows.data !== undefined && rows.data.length > 0 && (
					<ul className="flex flex-col gap-3">
						{/*
						 * The reason takes a whole line of its own below `sm` and shares the row above it. Sharing at
						 * every width truncated it to "Spam…" on a phone, which is narrower than the word it is
						 * hiding.
						 */}
						{rows.data.map((row) => (
							<li
								key={row.userId}
								className="border-border flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-3 last:border-0 last:pb-0"
							>
								<div className="order-1 flex min-w-0 flex-1 items-center gap-3">
									<Avatar name={row.tag ?? row.userId} url={row.avatarUrl} size={32} seed={row.userId} />
									<div className="min-w-0">
										{/* An account Discord no longer knows has no name, and the id is what identifies it anyway. */}
										<p className="truncate text-sm font-medium">{row.tag ?? "Unknown account"}</p>
										<p className="text-muted-foreground font-mono text-xs">{row.userId}</p>
									</div>
								</div>

								<p className="text-muted-foreground order-3 w-full text-sm sm:order-2 sm:w-auto sm:flex-1 sm:truncate sm:text-right">
									{row.reason}
								</p>

								<Button
									className="order-2 sm:order-3"
									variant="ghost"
									disabled={busy}
									onClick={() => {
										unblock.mutate(row.userId);
									}}
								>
									<UserX size={16} aria-hidden="true" />
									<span className="sr-only">Unblock {row.tag ?? row.userId}</span>
								</Button>
							</li>
						))}
					</ul>
				)}
			</Card>
		</div>
	);
}
