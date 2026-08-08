import { type MemberDetail } from "@testify/shared";
import { Avatar, Badge, Card, Figure } from "@/components/primitives";
import { describeJoined, softbanActive, statsOf } from "@/features/members/memberDetail.utils";

/** How many roles fit before the header stops being a glance. */
const ROLES_SHOWN = 12;

export function MemberIdentity({ detail }: { detail: MemberDetail }): React.JSX.Element {
	const extra = detail.roles.length - ROLES_SHOWN;

	return (
		<Card className="flex flex-wrap items-center gap-4">
			<Avatar name={detail.displayName} url={detail.avatarUrl} size={56} seed={detail.userId} />

			<div className="min-w-0 flex-1">
				<p className="flex flex-wrap items-center gap-2 text-sm font-medium">
					{detail.displayName}
					{detail.isBot && <Badge>Bot</Badge>}
					{!detail.inGuild && <Badge tone="warning">Left the server</Badge>}
					{softbanActive(detail) && <Badge tone="danger">Softbanned</Badge>}
				</p>
				<p className="text-muted-foreground text-xs">{describeJoined(detail.joinedAt)}</p>

				{detail.roles.length > 0 && (
					<ul className="mt-2 flex flex-wrap gap-1">
						{detail.roles.slice(0, ROLES_SHOWN).map((role) => (
							<li key={role.id}>
								<Badge>{role.name}</Badge>
							</li>
						))}
						{extra > 0 && (
							<li>
								<Badge>+{extra} more</Badge>
							</li>
						)}
					</ul>
				)}
			</div>
		</Card>
	);
}

export function MemberStanding({ detail }: { detail: MemberDetail }): React.JSX.Element | null {
	const rows = statsOf(detail);
	if (rows.length === 0) return null;

	return (
		<Card>
			<h2 className="text-base font-semibold">Standing in this server</h2>
			<dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
				{rows.map((row) => (
					<Figure key={row.label} label={row.label} value={row.value} size="md" />
				))}
			</dl>
		</Card>
	);
}
