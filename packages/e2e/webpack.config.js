const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = {
	mode: "development",
	entry: "./src/index.ts",
	devtool: "inline-source-map",
	plugins: [new Dotenv()],
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "dist"),
	},
	devServer: {
		static: {
			directory: path.join(__dirname, "public"),
		},
		liveReload: !process.env.CI,
		watchFiles: !process.env.CI
			? ["./src", "./*.{js,json,ts,html}", "../src", "../*.{js,json,ts,html}"]
			: [],
		compress: true,
		port: 3000,
	},
};
