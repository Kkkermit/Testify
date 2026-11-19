import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { format, resolveConfig } from "prettier";
import { instanceJsonSchema } from "@config/instance";

/** Writes `testify.config.schema.json` from the schema the bot reads its config file with. */

export const SCHEMA_FILE = "testify.config.schema.json";

export async function configSchemaText(): Promise<string> {
	const target = resolve(__dirname, "..", SCHEMA_FILE);
	return format(JSON.stringify(instanceJsonSchema()), { ...(await resolveConfig(target)), parser: "json" });
}

if (require.main === module) {
	configSchemaText()
		.then((text) => {
			writeFileSync(resolve(__dirname, "..", SCHEMA_FILE), text, "utf8");
			console.log(`Wrote ${SCHEMA_FILE}.`);
		})
		.catch((error: unknown) => {
			console.error(error);
			process.exit(1);
		});
}
