#!/usr/bin/env node
// serve-site - the built site served on this machine as its backends serve it (README.md, Open it): every
// response carrying the browser rule and its two companions, the entry `no-store` and the release's folder
// immutable, by the gate's own server (test/browser/site-server.js).
//
// Usage:  node tools/serve-site.mjs [PORT]    (default: 8080; build first with npm run build)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serveSite } from "../test/browser/site-server.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "site");
if (!fs.existsSync(path.join(site, "index.html"))) {
	console.log("serve-site: FAIL -- site/ is not built; run npm run build");
	process.exit(1);
}
const { origin } = await serveSite(site, { port: Number(process.argv[2] ?? 8080), hold: true });
console.log(`serve-site: serving site/ at ${origin}/ with the browser rule in every response; stop with Ctrl+C`);
