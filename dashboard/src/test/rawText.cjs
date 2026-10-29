/** Jest's stand-in for Vite's `?raw`: the file becomes a module whose default export is its text. */
module.exports = {
	process(source) {
		return { code: `module.exports = { __esModule: true, default: ${JSON.stringify(source)} };` };
	},
};
