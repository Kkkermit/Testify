import { useQueryClient } from "@tanstack/react-query";
import { confirmsName } from "@testify/shared";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Field, RowActions, SettingRows, Warning } from "@/components/form";
import { FIELD } from "@/components/form/fieldStyles";
import { Button, PageHeader } from "@/components/primitives";
import { useEraseAccount } from "@/features/account/useAccount";
import { useMe } from "@/features/auth/useMe";
import { usePageTitle } from "@/hooks/usePageTitle";
import { type TranslationKey } from "@/i18n";

const DELETED: TranslationKey[] = ["account.deletedMoney", "account.deletedCommunity", "account.deletedHistory"];
const KEPT: TranslationKey[] = ["account.keptModeration", "account.keptStaff", "account.keptDiscord"];

export function AccountPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("account.title"));
	const me = useMe();
	const erase = useEraseAccount();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [asking, setAsking] = useState(false);
	const [typed, setTyped] = useState("");

	const username = me.data?.user.username ?? "";
	const ready = confirmsName(typed, username, me.data?.user.id) && !erase.isPending;

	return (
		<>
			<PageHeader title={t("account.title")} subtitle={t("account.subtitle")} />

			<SettingRows title={t("account.whatGoes")} description={t("account.whatGoesBody")}>
				<ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
					{DELETED.map((key) => (
						<li key={key}>{t(key)}</li>
					))}
				</ul>
			</SettingRows>

			<SettingRows title={t("account.whatStays")} description={t("account.whatStaysBody")}>
				<ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
					{KEPT.map((key) => (
						<li key={key}>{t(key)}</li>
					))}
				</ul>
			</SettingRows>

			<SettingRows
				title={t("account.eraseTitle")}
				description={`${t("account.eraseBody")} ${t("account.orInDiscord")}`}
			>
				{asking ? (
					<>
						<Warning>{t("account.eraseWarning")}</Warning>
						<Field
							label={t("account.typeToConfirm", { name: username })}
							hint={t("account.confirmHint")}
							htmlFor="erase-confirm"
						>
							<input
								id="erase-confirm"
								className={FIELD}
								value={typed}
								autoComplete="off"
								onChange={(event) => {
									setTyped(event.target.value);
								}}
							/>
						</Field>
						{erase.error !== null && <Warning>{t("account.eraseFailed")}</Warning>}
						<RowActions>
							<Button
								variant="destructive"
								disabled={!ready}
								onClick={() => {
									erase.mutate(
										{ confirm: typed },
										{
											onSuccess: () => {
												queryClient.clear();
												void navigate("/", { replace: true, state: { erased: true } });
											},
										},
									);
								}}
							>
								<Trash2 size={16} aria-hidden="true" /> {t("account.eraseConfirm")}
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setAsking(false);
									setTyped("");
								}}
							>
								{t("common.cancel")}
							</Button>
						</RowActions>
					</>
				) : (
					<RowActions>
						<Button
							variant="destructive"
							onClick={() => {
								setAsking(true);
							}}
						>
							<Trash2 size={16} aria-hidden="true" /> {t("account.erase")}
						</Button>
					</RowActions>
				)}
			</SettingRows>
		</>
	);
}
