import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		root: ".",
		publicDir: "public",
		server: {
			port: 3000,
			open: false,
			strictPort: true,
		},
		build: {
			outDir: "dist",
			sourcemap: true,
			rollupOptions: {
				input: "index.html",
			},
		},
		define: {
			"process.env": env,
		},
		esbuild: {
			target: "es2019",
		},
	};
});
