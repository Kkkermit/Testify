import { SHOP_ROLE_LIMITS, type ShopRole } from "@testify/shared";
import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/app/ErrorState";
import { FIELD, Field, Refusal, SELECT, Warning } from "@/components/form";
import { RoleSwatch } from "@/components/form/RoleSwatch";
import { Button, Card, DividedList, SectionHeading, Skeleton } from "@/components/primitives";
import { useRemoveShopRole, useSellShopRole, useShopRoles } from "@/features/economy/useShopRoles";
import { useRoles } from "@/features/levelling/useLevelling";
import { numberIn } from "@/features/raid-protection/raid.utils";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/intl";

/** Roles members can buy in the shop: nothing that moderates, nothing the bot cannot give, at most ten. */
export function ShopRolesSection({ guildId }: { guildId: string }): React.JSX.Element {
	const { t } = useTranslation();
	const shop = useShopRoles(guildId);
	const roles = useRoles(guildId);
	const sell = useSellShopRole(guildId);
	const remove = useRemoveShopRole(guildId);
	const [roleId, setRoleId] = useState("");
	const [price, setPrice] = useState("");

	const listed = new Set((shop.data?.roles ?? []).map((entry) => entry.roleId));
	const canManage = shop.data?.canManage === true;
	const offerable = (roles.data ?? []).filter(
		(role) => role.id !== guildId && !role.managed && !role.powerful && role.assignableByBot && !listed.has(role.id),
	);
	const amount = numberIn(price, SHOP_ROLE_LIMITS.minPrice, SHOP_ROLE_LIMITS.maxPrice);
	const full = (shop.data?.roles.length ?? 0) >= SHOP_ROLE_LIMITS.max;

	return (
		<section aria-labelledby="shop-roles" className="flex flex-col gap-3">
			<SectionHeading as="h2" id="shop-roles" count={shop.data?.roles.length}>
				{t("economy.shopRoles")}
			</SectionHeading>
			<p className="text-muted-foreground text-sm">{t("economy.shopRolesBody")}</p>

			{shop.isError ? (
				<ErrorState as="h2" error={shop.error} onRetry={() => void shop.refetch()} />
			) : shop.isPending ? (
				<Skeleton className="h-24 w-full" />
			) : (
				shop.data.roles.length > 0 && (
					<Card padding="none">
						<DividedList className="rounded-card border-0">
							{shop.data.roles.map((entry) => (
								<ShopRoleRow
									key={entry.roleId}
									entry={entry}
									canManage={canManage}
									busy={sell.isPending || remove.isPending}
									onPrice={(next) => {
										sell.mutate({ roleId: entry.roleId, price: next });
									}}
									onRemove={() => {
										remove.mutate(entry.roleId);
									}}
								/>
							))}
						</DividedList>
					</Card>
				)
			)}

			{shop.data === undefined ? null : !canManage ? (
				<p className="text-muted-foreground text-sm">{t("economy.shopRolesNeedManageRoles")}</p>
			) : full ? (
				<Warning>{t("economy.shopRolesFull", { max: SHOP_ROLE_LIMITS.max })}</Warning>
			) : (
				<form
					className="flex flex-wrap items-end gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						if (roleId === "" || amount === null) return;
						sell.mutate(
							{ roleId, price: amount },
							{
								onSuccess: () => {
									setRoleId("");
									setPrice("");
								},
							},
						);
					}}
				>
					<Field label={t("economy.shopRole")} htmlFor="shop-role">
						<select
							id="shop-role"
							className={SELECT}
							value={roleId}
							onChange={(event) => {
								setRoleId(event.target.value);
							}}
						>
							<option value="" disabled>
								{t("economy.chooseRole")}
							</option>
							{offerable.map((role) => (
								<option key={role.id} value={role.id}>
									{role.name}
								</option>
							))}
						</select>
					</Field>
					<Field label={t("economy.shopPrice")} htmlFor="shop-price">
						<input
							id="shop-price"
							inputMode="numeric"
							value={price}
							onChange={(event) => {
								setPrice(event.target.value);
							}}
							className={cn(FIELD, "max-w-40 font-mono tabular-nums")}
						/>
					</Field>
					<Button type="submit" disabled={sell.isPending || roleId === "" || amount === null}>
						{t("economy.putOnSale")}
					</Button>
				</form>
			)}
			<Refusal error={sell.error ?? remove.error} />
		</section>
	);
}

function ShopRoleRow({
	entry,
	canManage,
	busy,
	onPrice,
	onRemove,
}: {
	entry: ShopRole;
	canManage: boolean;
	busy: boolean;
	onPrice: (price: number) => void;
	onRemove: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [text, setText] = useState(String(entry.price));
	const amount = numberIn(text, SHOP_ROLE_LIMITS.minPrice, SHOP_ROLE_LIMITS.maxPrice);
	const name = entry.name ?? t("economy.deletedRole");
	const id = `shop-price-${entry.roleId}`;

	return (
		<li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<RoleSwatch name={name} colour={entry.colour} />
				{entry.problem !== null && <span className="text-warning text-xs">{entry.problem}</span>}
			</div>
			{!canManage ? (
				<span className="font-mono text-sm tabular-nums">{formatNumber(entry.price)}</span>
			) : (
				<>
					<label htmlFor={id} className="sr-only">
						{t("economy.priceOf", { name })}
					</label>
					<input
						id={id}
						inputMode="numeric"
						value={text}
						aria-invalid={amount === null}
						onChange={(event) => {
							setText(event.target.value);
						}}
						onBlur={() => {
							if (amount !== null && amount !== entry.price) onPrice(amount);
						}}
						className={cn(FIELD, "max-w-32 font-mono tabular-nums", amount === null && "border-destructive")}
					/>
					<Button
						variant="secondary"
						disabled={busy}
						onClick={onRemove}
						aria-label={t("economy.takeOffSale", { name })}
					>
						<X size={15} aria-hidden="true" />
					</Button>
				</>
			)}
		</li>
	);
}
