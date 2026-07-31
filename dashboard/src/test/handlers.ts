import { type HealthResponse } from "@testify/shared";
import { http, HttpResponse } from "msw";

export const healthy: HealthResponse = {
	ok: true,
	uptimeMs: 65_000,
	discord: "ready",
	database: "connected",
};

export const handlers = [http.get("/api/health", () => HttpResponse.json(healthy))];
