import { type RoleMenuBody } from "@testify/shared";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ErrorState } from "@/app/ErrorState";
import { postableChannels, SavingIndicator, savingStateOf, Warning } from "@/components/form";
import { Card, EmptyState, Eyebrow, PageHeader, Skeleton } from "@/components/primitives";
import { useGuildOverview } from "@/features/guild-overview/useGuildOverview";
import { useChannels, useRoles } from "@/features/levelling/useLevelling";
import { RoleMenuForm } from "@/features/role-menus/components/RoleMenuForm";
import { RoleMenuRow } from "@/features/role-menus/components/RoleMenuRow";
import { draftOf, emptyDraft } from "@/features/role-menus/roleMenus.utils";
import {
	useCreateRoleMenu,
	usePublishRoleMenu,
	useRemoveRoleMenu,
	useRoleMenus,
	useUpdateRoleMenu,
} from "@/features/role-menus/useRoleMenus";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";

/** Menus members pick their own roles from; the roles they hand out stay below the manager's own and the bot's. */
export function RoleMenusPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { guildId = "" } = useParams();

	const list = useRoleMenus(guildId);
	const channels = useChannels(guildId);
	const roles = useRoles(guildId);
	const overview = useGuildOverview(guildId);
	const create = useCreateRoleMenu(guildId);
	const update = useUpdateRoleMenu(guildId);
	const publish = usePublishRoleMenu(guildId);
	const remove = useRemoveRoleMenu(guildId);
	const [editing, setEditing] = useState<string | null>(null);
	const [made, setMade] = useState(0);

	usePageTitle(t("roleMenus.title"), overview.data?.name);

	if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
	if (list.isPending || roles.isPending) return <Skeleton className="h-96 w-full" />;

	const menus = list.data.menus;
	const editingMenu = menus.find((menu) => menu.id === editing) ?? null;
	const full = menus.length >= list.data.limit;
	const busy = create.isPending || update.isPending || publish.isPending || remove.isPending;
	const message = (error: Error | null, fallback: string): string | null =>
		error === null ? null : error instanceof ApiError ? error.message : fallback;

	function save(body: RoleMenuBody): void {
		if (editingMenu === null) {
			create.mutate(body, {
				onSuccess: () => {
					setMade((count) => count + 1);
				},
			});
			return;
		}
		update.mutate(
			{ menuId: editingMenu.id, body },
			{
				onSuccess: () => {
					setEditing(null);
				},
			},
		);
	}

	const roleList = roles.data ?? [];
	const formError = message(editingMenu === null ? create.error : update.error, t("common.couldNotSave"));
	const actionError =
		message(publish.error, t("common.didNotWork")) ?? message(remove.error, t("common.couldNotRemove"));

	return (
		<>
			<PageHeader
				eyebrow={overview.data?.name}
				title={t("roleMenus.title")}
				subtitle={t("roleMenus.subtitle")}
				action={<SavingIndicator state={savingStateOf(busy, create.isSuccess || update.isSuccess)} />}
			/>

			<section aria-labelledby="menus-heading" className="flex flex-col gap-3">
				<Eyebrow
					as="h2"
					id="menus-heading"
					count={t("roleMenus.countOf", { used: menus.length, limit: list.data.limit })}
				>
					{t("roleMenus.inUse")}
				</Eyebrow>

				{menus.length === 0 ? (
					<Card>
						<EmptyState
							icon={<ListChecks size={28} />}
							title={t("roleMenus.emptyTitle")}
							body={t("roleMenus.emptyBody")}
						/>
					</Card>
				) : (
					<ul className="flex flex-col gap-3">
						{menus.map((menu) => (
							<RoleMenuRow
								key={menu.id}
								menu={menu}
								channels={channels.data ?? []}
								roles={roleList}
								busy={busy}
								onEdit={() => {
									setEditing(menu.id);
								}}
								onPublish={() => {
									publish.mutate({ menuId: menu.id });
								}}
								onRemove={() => {
									if (editing === menu.id) setEditing(null);
									remove.mutate({ menuId: menu.id });
								}}
							/>
						))}
					</ul>
				)}

				{actionError !== null && <Warning>{actionError}</Warning>}
			</section>

			{editingMenu === null && full ? (
				<Warning>{t("roleMenus.full")}</Warning>
			) : (
				<RoleMenuForm
					// A fresh form per menu, so switching between them never carries one's draft into another.
					key={editingMenu?.id ?? `new-${String(made)}`}
					initial={editingMenu === null ? emptyDraft() : draftOf(editingMenu, roleList)}
					editing={editingMenu?.title ?? null}
					channels={postableChannels(channels.data ?? [])}
					roles={roleList}
					saving={busy}
					error={formError}
					onSave={save}
					{...(editingMenu === null
						? {}
						: {
								onCancel: () => {
									setEditing(null);
								},
							})}
				/>
			)}
		</>
	);
}
