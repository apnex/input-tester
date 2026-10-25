// built-site - where the tests find the tester as built (tools/build-site.mjs): the site's root, its release
// folder, and each built module of `app/`, imported from the very files a release holds, which import the four
// parts from the folder's `vendor/` by relative path.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const siteRoot = path.join(repositoryRoot, "site");
export const releaseFolder = `v${JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8")).version}`;

/** Imports one built module of the site's `app/` folder. */
export function importBuilt(name) {
	const file = path.join(siteRoot, releaseFolder, "app", name);
	if (!fs.existsSync(file)) throw new Error(`built-site: ${file} is not built; run npm run build`);
	return import(pathToFileURL(file).href);
}

/** Imports one of the four parts as the site vendors it. */
export function importVendored(part) {
	return import(pathToFileURL(path.join(siteRoot, releaseFolder, "vendor", part, "index.js")).href);
}
