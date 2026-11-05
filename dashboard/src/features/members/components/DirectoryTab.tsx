import {
	DIRECTORY_JOINED,
	DIRECTORY_KINDS,
	DIRECTORY_LIMITS,
	type DirectoryPage,
	type DirectoryRow,
} from "@testify/shared";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { Field, SearchField } from "@/components/form";
import { CHECK_ROW, SELECT } from "@/components/form/fieldStyles";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import {
	Avatar,
	Badge,
	Button,
	Card,
	DividedList,
	EmptyState,
	SegmentedControl,
	Skeleton,
	Summary,
} from "@/components/primitives";
import { ActionForm } from "@/features/members/components/ActionForm";
import {
	ACTION_LABELS,
	bulkActions,
	directorySearch,
	type DirectoryFilters,
	filtersFrom,
	JOINED_LABELS,
	KIND_LABELS,
	type MemberAction,
	rowActions,
	selectable,
	SKIP_LABELS,
	toggled,
} from "@/features/members/directory.utils";
import { useDirectory } from "@/features/members/useDirectory";
import { useDebounced } from "@/hooks/useDebounced";
import { cn } from "@/lib/cn";
import { dateAndTime, shortDate } from "@/lib/datetime";

interface Acting {
	action: MemberAction;
	targets: DirectoryRow[];
	/** The row it was opened from, or null for everybody ticked. */
	from: string | null;
}

export function DirectoryTab({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const [params, setParams] = useSearchParams();
	const filters = filtersFrom(params);
	const [typed, setTyped] = useState(filters.q);
	const searched = useDebounced(typed);
	const settled: DirectoryFilters = { ...filters, q: searched };
	const filterKey = directorySearch(settled, null);

	// Earlier cursors are kept per set of filters, so a change of filter starts again from the first page.
	const [trail, setTrail] = useState<{ key: string; cursors: (string | null)[] }>({ key: filterKey, cursors: [null] });
	const cursors = trail.key === filterKey ? trail.cursors : [null];
	const after = cursors.at(-1) ?? null;
	const directory = useDirectory(guildId, directorySearch(settled, after));
	const page = directory.data;

	const [selected, setSelected] = useState<Map<string, DirectoryRow>>(new Map());
	const [acting, setActing] = useState<Acting | null>(null);
	const [open, setOpen] = useState<string | null>(null);

	function put(key: string, value: string, fallback: string): void {
		setParams(
			(current) => {
				const merged = new URLSearchParams(current);
				if (value === fallback) merged.delete(key);
				else merged.set(key, value);
				return merged;
			},
			{ replace: key === "q" },
		);
		setSelected(new Map());
		setActing(null);
	}

	function move(cursorsNext: (string | null)[]): void {
		setTrail({ key: filterKey, cursors: cursorsNext });
		setOpen(null);
	}

	return (
		<div className="flex flex-col gap-4">
			<Card className="flex flex-col gap-4">
				<SearchField
					label={t("directory.search")}
					placeholder={t("directory.searchPlaceholder")}
					value={typed}
					onChange={(value) => {
						setTyped(value.slice(0, DIRECTORY_LIMITS.maxQuery));
						put("q", value.trim(), "");
					}}
				/>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Field label={t("directory.role")} htmlFor="directory-role">
						<select
							id="directory-role"
							className={SELECT}
							value={filters.roleId}
							onChange={(event) => {
								put("role", event.target.value, "");
							}}
						>
							<option value="">{t("directory.anyRole")}</option>
							{page?.roles.map((role) => (
								<option key={role.id} value={role.id}>
									{role.name}
								</option>
							))}
						</select>
					</Field>
					<Field label={t("directory.joined")} htmlFor="directory-joined">
						<select
							id="directory-joined"
							className={SELECT}
							value={filters.joined}
							onChange={(event) => {
								put("joined", event.target.value, "any");
							}}
						>
							{DIRECTORY_JOINED.map((joined) => (
								<option key={joined} value={joined}>
									{t(JOINED_LABELS[joined])}
								</option>
							))}
						</select>
					</Field>
				</div>
				<div className="flex flex-wrap items-center gap-4">
					<SegmentedControl
						label={t("directory.kind")}
						value={filters.kind}
						segments={DIRECTORY_KINDS.map((kind) => ({ value: kind, label: t(KIND_LABELS[kind]) }))}
						onChange={(kind) => {
							put("kind", kind, "all");
						}}
					/>
					<label className={cn(CHECK_ROW, "px-0")}>
						<input
							type="checkbox"
							checked={filters.timedOut}
							onChange={(event) => {
								put("timedOut", event.target.checked ? "1" : "0", "0");
							}}
						/>
						{t("directory.timedOut")}
					</label>
					{page?.can.warn === true && (
						<label className={cn(CHECK_ROW, "px-0")}>
							<input
								type="checkbox"
								checked={filters.warned}
								onChange={(event) => {
									put("warned", event.target.checked ? "1" : "0", "0");
								}}
							/>
							{t("directory.warned")}
						</label>
					)}
				</div>
			</Card>

			{page !== undefined && (
				<div aria-live="polite" className="flex flex-col gap-1">
					<Summary>{t("directory.inServer", { count: page.memberCount })}</Summary>
					{page.searchCut && (
						<p className="text-muted-foreground text-sm">
							{t("directory.searchCut", { count: DIRECTORY_LIMITS.readBatch })}
						</p>
					)}
					{page.scanStopped && (
						<p className="text-muted-foreground text-sm">
							{t("directory.scanStopped", { count: DIRECTORY_LIMITS.maxScan })}
						</p>
					)}
				</div>
			)}

			{page !== undefined && selected.size > 0 && (
				<BulkBar
					page={page}
					selected={selected}
					onAct={(action) => {
						setActing({ action, targets: [...selected.values()], from: null });
					}}
					onClear={() => {
						setSelected(new Map());
					}}
				/>
			)}

			{page !== undefined && acting !== null && acting.from === null && (
				<ActionForm
					guildId={guildId}
					action={acting.action}
					targets={acting.targets}
					page={page}
					onClose={() => {
						setActing(null);
						setSelected(new Map());
					}}
				/>
			)}

			{directory.isError ? (
				<ErrorState as="h2" error={directory.error} onRetry={() => void directory.refetch()} />
			) : page === undefined ? (
				<Skeleton className="h-96 w-full" />
			) : page.rows.length === 0 ? (
				<EmptyState icon={<Users size={28} />} title={t("directory.noneTitle")} body={t("directory.noneBody")} />
			) : (
				<Card padding="none">
					<DividedList aria-label={t("directory.listLabel")}>
						{page.rows.map((row) => (
							<MemberRow
								key={row.userId}
								guildId={guildId}
								row={row}
								page={page}
								ticked={selected.has(row.userId)}
								onTick={() => {
									setSelected((current) => toggled(current, row));
								}}
								open={open === row.userId}
								onOpen={() => {
									setOpen((current) => (current === row.userId ? null : row.userId));
									if (acting?.from === row.userId) setActing(null);
								}}
								acting={acting?.from === row.userId ? acting.action : null}
								onAct={(action) => {
									setActing({ action, targets: [row], from: row.userId });
								}}
								onClose={() => {
									setActing(null);
								}}
							/>
						))}
					</DividedList>
				</Card>
			)}

			{page !== undefined && (cursors.length > 1 || page.next !== null) && (
				<nav aria-label={t("directory.pages")} className="flex justify-between gap-2">
					<Button
						variant="secondary"
						disabled={cursors.length <= 1}
						onClick={() => {
							move(cursors.slice(0, -1));
						}}
					>
						<ChevronLeft size={16} aria-hidden="true" /> {t("common.previous")}
					</Button>
					<Button
						variant="secondary"
						disabled={page.next === null}
						onClick={() => {
							move([...cursors, page.next]);
						}}
					>
						{t("common.next")} <ChevronRight size={16} aria-hidden="true" />
					</Button>
				</nav>
			)}
		</div>
	);
}

function BulkBar({
	page,
	selected,
	onAct,
	onClear,
}: {
	page: DirectoryPage;
	selected: ReadonlyMap<string, DirectoryRow>;
	onAct: (action: MemberAction) => void;
	onClear: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Card padding="compact" className="flex flex-col gap-3">
			<p className="text-sm font-medium" role="status">
				{t("directory.selected", { count: selected.size })}
				{selected.size >= DIRECTORY_LIMITS.maxBatch && (
					<span className="text-muted-foreground font-normal">
						{" "}
						{t("directory.batchCap", { count: DIRECTORY_LIMITS.maxBatch })}
					</span>
				)}
			</p>
			<div className="flex flex-wrap gap-2">
				{bulkActions(page).map((action) => (
					<Button
						key={action}
						variant={action === "kick" || action === "ban" ? "destructive" : "secondary"}
						onClick={() => {
							onAct(action);
						}}
					>
						{t(ACTION_LABELS[action])}
					</Button>
				))}
				<Button variant="ghost" onClick={onClear}>
					{t("directory.clearSelection")}
				</Button>
			</div>
		</Card>
	);
}

function MemberRow({
	guildId,
	row,
	page,
	ticked,
	onTick,
	open,
	onOpen,
	acting,
	onAct,
	onClose,
}: {
	guildId: string;
	row: DirectoryRow;
	page: DirectoryPage;
	ticked: boolean;
	onTick: () => void;
	open: boolean;
	onOpen: () => void;
	acting: MemberAction | null;
	onAct: (action: MemberAction) => void;
	onClose: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const actions = rowActions(row, page);
	const shown = row.roleIds.slice(0, 3).flatMap((id) => page.roles.filter((role) => role.id === id));
	const panel = `member-actions-${row.userId}`;

	return (
		<li className="flex flex-col gap-3 px-4 py-3">
			<div className="flex items-start gap-3">
				{selectable(page) && (
					<input
						type="checkbox"
						className="mt-2.5"
						aria-label={t("directory.select", { name: row.displayName })}
						checked={ticked}
						disabled={row.block === "you" || row.block === "owner" || row.block === "bot"}
						onChange={onTick}
					/>
				)}
				<Avatar name={row.displayName} url={row.avatarUrl} size={36} seed={row.userId} />
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<Link
							to={`/guilds/${guildId}/members/${row.userId}`}
							className="text-sm font-medium break-all hover:underline"
						>
							{row.displayName}
						</Link>
						<span className="text-muted-foreground text-xs break-all">@{row.username}</span>
						{row.isBot && <Badge>{t("members.bot")}</Badge>}
						{row.block === "you" && <Badge>{t("members.you")}</Badge>}
						{row.warnings !== null && row.warnings > 0 && (
							<Badge tone="danger">{t("directory.warnings", { count: row.warnings })}</Badge>
						)}
					</div>
					<div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
						{row.joinedAt !== null && <span>{t("directory.joinedOn", { date: shortDate(row.joinedAt) })}</span>}
						{row.timedOutUntil !== null && (
							<span className="text-warning">
								{t("directory.timedOutUntil", { when: dateAndTime(row.timedOutUntil) })}
							</span>
						)}
						{shown.map((role) => (
							<RoleSwatch key={role.id} name={role.name} colour={role.colour} />
						))}
						{row.roleIds.length > shown.length && (
							<span>{t("members.moreRoles", { count: row.roleIds.length - shown.length })}</span>
						)}
					</div>
				</div>
				<Button
					variant="ghost"
					aria-expanded={open}
					aria-controls={panel}
					aria-label={t("directory.actionsFor", { name: row.displayName })}
					onClick={onOpen}
				>
					{t("directory.actions")}
				</Button>
			</div>

			{open && (
				<div id={panel} className="flex flex-col gap-3 sm:pl-12">
					<div className="flex flex-wrap items-center gap-2">
						{actions.map((action) => (
							<Button
								key={action}
								variant={acting === action ? "primary" : "secondary"}
								aria-pressed={acting === action}
								onClick={() => {
									onAct(action);
								}}
							>
								{t(ACTION_LABELS[action])}
							</Button>
						))}
						<Link
							to={`/guilds/${guildId}/members/${row.userId}`}
							className="text-accent px-2 text-sm font-medium hover:underline"
						>
							{t("directory.openPage")}
						</Link>
					</div>
					{row.block !== null && <p className="text-muted-foreground text-sm">{t(SKIP_LABELS[row.block])}</p>}
					{acting !== null && (
						<ActionForm guildId={guildId} action={acting} targets={[row]} page={page} onClose={onClose} />
					)}
				</div>
			)}
		</li>
	);
}
