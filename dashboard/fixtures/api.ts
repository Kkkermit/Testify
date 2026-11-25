import { getResponse } from "msw";
import { showcaseHandlers } from "./showcase";
import { handlers } from "@/test/handlers";

/** The dashboard's API answered from fixtures: the showcase first, then everything the test suite already serves. */

const everything = [...showcaseHandlers, ...handlers];

export async function answer(request: Request): Promise<Response | undefined> {
	return getResponse(everything, request, { baseUrl: new URL(request.url).origin });
}
