import type { NextConfig } from "next";
export { LiveStyleSyncPlugin } from "livestylesync-webpack-plugin";
import { LiveStyleSyncPlugin } from "livestylesync-webpack-plugin";

interface LiveStyleSyncOptions {
	port?: number;
}

export function withLiveStyleSync(
	nextConfig: NextConfig = {},
	options: LiveStyleSyncOptions = {}
): NextConfig {
	return {
		...nextConfig,
		webpack(config, context) {
			if (context.dev) {
				config.plugins ??= [];
				config.plugins.push(new LiveStyleSyncPlugin({ port: options.port }));
			}

			if (typeof nextConfig.webpack === "function") {
				return nextConfig.webpack(config, context);
			}
			return config;
		},
	};
}
