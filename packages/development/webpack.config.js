const path = require("path");
const Dotenv = require("dotenv-webpack");

console.log(path.resolve(__dirname, ".env"));

module.exports = {
	mode: "development",
	entry: "./src/index.ts",
	devtool: "inline-source-map",
	plugins: [
		new Dotenv({
			path: path.resolve(__dirname, ".env"),
		}),
	],
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
		watchFiles: [
			"./src",
			"./*.{js,json,ts,html}",
			"../src",
			"../*.{js,json,ts,html}",
		],
		compress: true,
		port: 9000,
	},
};
