import { TEST_POST_LIMITS } from "@testify/shared";
import { type TFunction } from "i18next";
import { ApiError } from "@/lib/api";

type SendState = "idle" | "pending" | "success" | "error";

export function sendTestStatus(state: SendState, error: Error | null, t: TFunction): string {
	if (state === "pending") return t("testPost.sending");
	if (state === "success") return t("testPost.sent");
	if (state !== "error") return t("testPost.hint");

	if (!(error instanceof ApiError)) return t("testPost.failed");
	if (error.code === "dm_closed") return t("testPost.dmClosed");
	if (error.code === "not_a_member") return t("testPost.notAMember");
	if (error.code === "rate_limited") return t("testPost.tooMany", { count: TEST_POST_LIMITS.perMinute });
	return error.status === 400 ? error.message : t("testPost.failed");
}
