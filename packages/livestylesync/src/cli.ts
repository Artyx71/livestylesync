#!/usr/bin/env node
import { createServer } from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { startWss } from "livestylesync-server-core";

const args = process.argv.slice(2);
const flag = (name: string, def: string) => {
	const i = args.indexOf(name);
	return i !== -1 ? args[i + 1] : def;
};

const root     = flag("--root", process.cwd());
const wssPort  = parseInt(flag("--wss-port", "3100"), 10);
const httpPort = parseInt(flag("--port", "3099"), 10);

const overlayPath = fileURLToPath(import.meta.resolve("livestylesync-overlay"));
const overlayJs = readFileSync(overlayPath, "utf8");

const clientScript = [
	`import { mount } from "http://localhost:${httpPort}/__livestylesync/overlay.js";`,
	`mount({ port: ${wssPort} });`,
].join("\n");

const server = createServer((request, res) => {
	if (request.url === "/__livestylesync/overlay.js") {
		res.writeHead(200, { "Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*" });
		res.end(overlayJs);
		return;
	}
	if (request.url === "/__livestylesync/client.js") {
		res.writeHead(200, { "Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*" });
		res.end(clientScript);
		return;
	}
	res.writeHead(404);
	res.end();
});

server.listen(httpPort, () => {
	startWss(root, server, wssPort);

	console.log(`\n[LiveStyleSync]`);
	console.log(`  Root:    ${root}`);
	console.log(`  WSS:     ws://localhost:${wssPort}`);
	console.log(`  Overlay: http://localhost:${httpPort}/__livestylesync/client.js`);
	console.log(`\nAdd to your HTML:\n`);
	console.log(`  <script type="module" src="http://localhost:${httpPort}/__livestylesync/client.js"></script>\n`);
});
