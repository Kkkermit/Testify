module.exports = {
	process(source) {
		return { code: `module.exports = { __esModule: true, default: ${JSON.stringify(source)} };` };
	},
};
