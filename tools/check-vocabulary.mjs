#!/usr/bin/env node
// check-vocabulary - the vocabulary check (docs/ARCHITECTURE-TARGET.md GT7, P8): fails when the tester's own
// words -- its source, its page shell and its guide -- hold a word of another application's vocabulary, in code,
// a string or a comment. The list is the one the four shared parts' vocabulary checks refuse on behalf of their
// first consumer, and the matching is theirs, run here as the components' consumer vocabulary approach runs it.
//
// Every run of letters, digits, underscores and hyphens is a candidate whole, lower-cased, and again with its
// underscores and hyphens removed; and it is split at case changes, underscores, hyphens and between letters and
// digits, each part a candidate too. A candidate matches a listed word when it equals it, or equals it once a
// trailing "s" or "es" is removed. A word the tester genuinely needs -- a platform's own name -- is allowed by
// its exact text in consumer-vocabulary.json and docs/DECISIONS.md, that text removed before the scan, never by
// loosening the match.
//
// Usage:  node tools/check-vocabulary.mjs [DIR_OR_FILE ...]    (default: src, page, docs/GUIDE.md)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

/** The lists and the allowed texts: { lists: { application: [word, ...] }, allowed: [{ text, why }] }. */
export function readVocabulary(file = path.join(here, "consumer-vocabulary.json")) {
	const { lists, allowed } = JSON.parse(fs.readFileSync(file, "utf8"));
	return { lists, allowed: allowed ?? [] };
}

/** Splits text into lower-cased words at case changes, underscores, hyphens, letters against digits, and every other non-word character. */
export function splitWords(text) {
	const words = [];
	for (const run of text.match(/[A-Za-z0-9_-]+/g) ?? []) {
		for (const piece of run.split(/[_-]+/)) {
			if (!piece) continue;
			for (const word of piece.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])/)) if (word) words.push(word.toLowerCase());
		}
	}
	return words;
}

/** Every candidate word of a text: each run whole, each run without its underscores and hyphens, and each split word. */
export function candidateWords(text) {
	const out = [];
	for (const run of text.match(/[A-Za-z0-9_-]+/g) ?? []) {
		const whole = run.toLowerCase();
		out.push(...new Set([whole, whole.replace(/[_-]+/g, ""), ...splitWords(run)]));
	}
	return out;
}

/** The listed word a candidate matches -- equal, or equal once a trailing "s" or "es" is removed -- or undefined. */
function matching(candidate, owner) {
	if (owner.has(candidate)) return candidate;
	if (candidate.endsWith("s") && owner.has(candidate.slice(0, -1))) return candidate.slice(0, -1);
	if (candidate.endsWith("es") && owner.has(candidate.slice(0, -2))) return candidate.slice(0, -2);
	return undefined;
}

/** Every listed word a text holds once the allowed texts are removed: [{ line, word, listed, owner }], in order. */
export function findVocabulary(text, { lists, allowed }) {
	const owner = new Map();
	for (const [application, words] of Object.entries(lists)) for (const w of words) owner.set(w.toLowerCase(), application);
	const found = [];
	text.split("\n").forEach((line, i) => {
		let kept = line;
		for (const { text: exact } of allowed) kept = kept.split(exact).join(" ");
		for (const word of candidateWords(kept)) {
			const listed = matching(word, owner);
			if (listed !== undefined) found.push({ line: i + 1, word, listed, owner: owner.get(listed) });
		}
	});
	return found;
}

function filesUnder(target) {
	if (!fs.existsSync(target)) return [];
	if (fs.statSync(target).isFile()) return [target];
	return fs.readdirSync(target, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)).flatMap((e) => filesUnder(path.join(target, e.name)));
}

/** The tester's own words: its source, its page shell and its guide. */
export const DEFAULT_TARGETS = ["src", "page", "docs/GUIDE.md"];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const targets = process.argv.slice(2);
	const vocabulary = readVocabulary();
	const files = (targets.length ? targets.map((t) => path.resolve(t)) : DEFAULT_TARGETS.map((t) => path.join(root, t))).flatMap(filesUnder);
	if (files.length === 0) {
		console.log("check-vocabulary: FAIL -- no files found, so nothing was checked");
		process.exit(1);
	}
	let findings = 0;
	for (const file of files) {
		for (const f of findVocabulary(fs.readFileSync(file, "utf8"), vocabulary)) {
			console.log(`  ${path.relative(process.cwd(), file)}:${f.line}  "${f.word}" (${f.owner}: ${f.listed})`);
			findings++;
		}
	}
	if (findings) {
		console.log(`check-vocabulary: FAIL -- ${findings} word(s) of another application's vocabulary in ${files.length} file(s)`);
		process.exit(1);
	}
	console.log(`check-vocabulary: PASS -- ${files.length} file(s), no word of ${Object.keys(vocabulary.lists).join(" or ")}'s vocabulary`);
}
