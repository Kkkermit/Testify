import { type MiddlewareHandler } from "hono";
import { type ApiBindings } from "@api/context";
import { featureOff } from "@api/errors";
import { routeIsOff } from "@testify/shared";

/** Every route a switched-off feature declares answers 404, read off the same decoded path the router matches. */
export const refuseSwitchedOff: MiddlewareHandler<ApiBindings> = async (context, next) => {
	const off = context.get("client").featuresOff;
	if (off.size > 0 && routeIsOff(off, context.req.path.replace(/^\/api(?=\/|$)/, "")) !== null) throw featureOff();

	await next();
};
