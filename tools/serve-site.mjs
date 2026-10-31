#!/usr/bin/env node
// serve-site - the built site served on this machine as its backends serve it (README.md, Open it): every
// response carrying the browser rule and its two companions, the entry `no-store` and the release's folder
// immutable, by the gate's own server (test/browser/site-server.js). That server, test-harness's serveStatic, listens
// on a port the system gives it, and this tool is found at a fixed one: each connection to the fixed port is passed,
// byte for byte, to it -- the one local piece, until test-harness's server takes a port (docs/DECISIONS.md 0005).
//
// Usage:  node tools/serve-site.mjs [PORT]    (default: 8080; build first with npm run build)
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serveSite } from "../test/browser/site-server.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "site");
if (!fs.existsSync(path.join(site, "index.html"))) {
	console.log("serve-site: FAIL -- site/ is not built; run npm run build");
	process.exit(1);
}
const port = Number(process.argv[2] ?? 8080);
const server = await serveSite(site, { hold: true });
const served = Number(new URL(server.origin).port);
const forwarder = net.createServer((socket) => {
	const upstream = net.connect(served, "127.0.0.1");
	socket.pipe(upstream).pipe(socket);
	socket.on("error", () => upstream.destroy());
	upstream.on("error", () => socket.destroy());
});
await new Promise((resolve, reject) => forwarder.once("error", reject).listen(port, "127.0.0.1", resolve));
console.log(`serve-site: serving site/ at http://127.0.0.1:${port}/ with the browser rule in every response; stop with Ctrl+C`);
