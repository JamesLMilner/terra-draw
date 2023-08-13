const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = {
	mode: "development",
	entry: {
		mtk: "./src/maptalks.ts",
		index: "./src/index.ts",
	},
	devtool: "source-map",
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
		filename: "[name].js",
		path: path.resolve(__dirname, "dist"),
	},
	devServer: {
		static: {
			directory: path.join(__dirname),
		},
		watchFiles: ["../**/**"],
		compress: true,
		port: 9000,
	},
};
