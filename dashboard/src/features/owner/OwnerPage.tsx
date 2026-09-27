import { type AnalyticsWindow, type ReportedLogLevel } from "@testify/shared";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { PageHeader, TabBar, TabContent } from "@/components/primitives";
import { CommandsPage } from "@/features/commands/CommandsPage";
import { OWNER_TABS, ownerTabFrom } from "@/features/owner/owner.types";
import { levelFrom, windowFrom } from "@/features/owner/owner.utils";
import { BlacklistTab } from "@/features/owner/tabs/BlacklistTab";
import { ControlTab } from "@/features/owner/tabs/ControlTab";
import { LogsTab } from "@/features/owner/tabs/LogsTab";
import { OverviewTab } from "@/features/owner/tabs/OverviewTab";
import { RunnerTab } from "@/features/owner/tabs/RunnerTab";
import { RuntimeTab } from "@/features/owner/tabs/RuntimeTab";
import { UsageTab } from "@/features/owner/tabs/UsageTab";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Each tab fetches its own data, so a failing endpoint takes out one tab rather than the console. */
export function OwnerPage(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("owner.title"));
	// In the URL, so a link to the usage tab is a link to the usage tab and Back works.
	const [params, setParams] = useSearchParams();
	const tab = ownerTabFrom(params.get("tab"));

	/** `replace` is for a value that changes as it is typed — a history entry per keystroke makes Back useless. */
	function put(key: string, value: string, replace = false): void {
		setParams(
			(current) => {
				const merged = new URLSearchParams(current);
				merged.set(key, value);
				return merged;
			},
			{ replace },
		);
	}

	return (
		<>
			<PageHeader title={t("owner.title")} subtitle={t("owner.subtitle")} />

			<TabBar
				label={t("owner.title")}
				tabs={OWNER_TABS}
				active={tab}
				onSelect={(next) => {
					put("tab", next);
				}}
			/>

			<TabContent label={t("owner.title")} active={tab}>
				{tab === "overview" && <OverviewTab />}
				{tab === "usage" && (
					<UsageTab
						days={windowFrom(params.get("days"))}
						onWindow={(days: AnalyticsWindow) => {
							put("days", String(days));
						}}
					/>
				)}
				{tab === "logs" && (
					<LogsTab
						level={levelFrom(params.get("level"))}
						search={params.get("q") ?? ""}
						paused={params.get("paused") === "1"}
						onLevel={(level: ReportedLogLevel) => {
							put("level", level);
						}}
						onSearch={(next) => {
							put("q", next, true);
						}}
						onPause={(next) => {
							put("paused", next ? "1" : "0");
						}}
					/>
				)}
				{tab === "commands" && <CommandsPage scope="global" />}
				{tab === "run" && <RunnerTab />}
				{tab === "blacklist" && <BlacklistTab />}
				{tab === "runtime" && <RuntimeTab />}
				{tab === "control" && <ControlTab />}
			</TabContent>
		</>
	);
}
