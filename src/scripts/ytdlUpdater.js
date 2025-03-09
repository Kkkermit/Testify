const { execSync } = require("child_process");
const { color, getTimestamp } = require("../utils/loggingEffects");

function updateYTDLPackages() {
	try {
		console.log(
			`${color.blue}[${getTimestamp()}] [UPDATING_PACKAGE] Updating critical DisTube packages...${color.reset}`,
		);
		console.log(`${color.yellow}[${getTimestamp()}] [UPDATING_PACKAGE] Updating @distube/ytdl-core...${color.reset}`);
		try {
			execSync("npm install @distube/ytdl-core@latest --save --no-fund", { stdio: "inherit" });
			console.log(
				`${color.green}[${getTimestamp()}] [UPDATING_PACKAGE] @distube/ytdl-core updated successfully${color.reset}`,
			);
		} catch (error) {
			console.error(
				`${color.red}[${getTimestamp()}] [UPDATING_PACKAGE] Error updating @distube/ytdl-core: ${error.message}${
					color.reset
				}`,
			);
		}
		console.log(`${color.yellow}[${getTimestamp()}] [UPDATING_PACKAGE] Updating @distube/ytsr...${color.reset}`);
		try {
			execSync("npm install @distube/ytsr@latest --save --no-fund", { stdio: "inherit" });
			console.log(
				`${color.green}[${getTimestamp()}] [UPDATING_PACKAGE] @distube/ytsr updated successfully${color.reset}`,
			);
		} catch (error) {
			console.error(
				`${color.red}[${getTimestamp()}] [UPDATING_PACKAGE] Error updating @distube/ytsr: ${error.message}${
					color.reset
				}`,
			);
		}

		return true;
	} catch (error) {
		console.error(
			`${color.red}[${getTimestamp()}] [UPDATING_PACKAGE] Error in update process: ${error.message}${color.reset}`,
		);
		return false;
	}
}

if (require.main === module) {
	updateYTDLPackages();
}

module.exports = updateYTDLPackages;
