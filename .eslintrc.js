module.exports = {
	env: {
		commonjs: true,
		es2021: true,
		node: true,
	},
	extends: "eslint:recommended",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "script",
	},
	rules: {},
	overrides: [
		{
			files: [
				"default-import-config.js",
				"bin/__tests__/__fixtures__/**/import-config.js",
			],
			parserOptions: { sourceType: "module" },
			rules: {
				"no-unused-vars": "off",
			},
		},
		{
			files: ["bin/__tests__/__fixtures__/**"],
			parserOptions: { sourceType: "module" },
		},
	],
};
