// chrome-driver - headless Chrome driven over the DevTools protocol, for the gate's browser tests
// (docs/ARCHITECTURE-TARGET.md section 8): no dependency, the protocol spoken over Node.js's global WebSocket.
//
// Taken from the shared parts' own drivers, as their gates launch Chrome, and kept here as the fifth copy of
// one harness (section 10, row 11). Chrome is $CHROME, or google-chrome on PATH, launched headless with a
// profile of its own in a scratch directory and a debugging port of its own -- port 0, so Chrome chooses a
// free one and writes it to DevToolsActivePort in that profile -- so it never touches another Chrome on the
// machine. Beyond the parts' drivers it hands the protocol's events to listeners (`on`), which the
// containment monitor needs to see every request from before navigation through teardown.
//
// Teardown can neither fail the run nor hang it. Chrome is spawned detached, the leader of a process group
// of its own, and the whole group is killed -- its renderer, GPU, network, crashpad and zygote processes
// with it -- and the wait for the group to end is bounded. The profile is removed with retries, and so is the
// directory Chrome makes beside it in the scratch directory for its singleton socket, found by the link the
// profile holds to it and named with or without a leading dot, as one Chrome or another names it; a
// directory that still cannot be removed is a warning on stderr, never a failure.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const warnOnStderr = (message) => process.stderr.write(`chrome-driver: warning: ${message}\n`);

/** True while any process of the group led by `pid` is alive. */
function groupAlive(pid) {
	try {
		process.kill(-pid, 0);
		return true;
	} catch (error) {
		return error.code === "EPERM";
	}
}

/** Spawns a command detached, the leader of a process group of its own, unreferenced so it never holds the process open. */
export function launchGroup(command, args) {
	const child = spawn(command, args, { stdio: "ignore", detached: true });
	let exited = null;
	child.on("exit", (code, signal) => (exited = { code, signal }));
	child.on("error", (error) => (exited = { error: error.message }));
	child.unref();
	return { child, exited: () => exited, stop: (boundMs) => stopGroup(child, boundMs) };
}

/** Kills a detached child's whole process group and waits at most `boundMs` for it to end; answers whether it ended. Never throws. */
export async function stopGroup(child, boundMs = 5000) {
	if (child.pid === undefined) return true;
	try {
		process.kill(-child.pid, "SIGKILL");
	} catch {
		try {
			child.kill("SIGKILL");
		} catch {
			// already gone
		}
	}
	for (let waited = 0; waited < boundMs; waited += 25) {
		if (!groupAlive(child.pid)) return true;
		await sleep(25);
	}
	warnOnStderr(`process group ${child.pid} still had a live process after ${boundMs} ms`);
	return false;
}

/** Removes a scratch directory with retries; one that still cannot be removed is a warning, never a failure. Answers whether it went. */
export function removeProfile(profile, warn = warnOnStderr) {
	try {
		fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
		return true;
	} catch (error) {
		warn(`left the scratch profile ${profile}: ${error?.code ?? ""} ${error?.message ?? error}`);
		return false;
	}
}

/**
 * Removes the directory Chrome made in the scratch directory for its singleton socket, named by the link
 * `SingletonSocket` in its profile -- only a directory directly in os.tmpdir() whose name is Chrome's
 * `com.google.Chrome.` and six letters or digits, with or without a leading dot. Answers the directory removed, or null.
 */
export function removeSingleton(profile, warn = warnOnStderr) {
	let dir;
	try {
		dir = path.dirname(fs.readlinkSync(path.join(profile, "SingletonSocket")));
	} catch {
		return null;
	}
	if (path.dirname(dir) !== path.resolve(os.tmpdir()) || !/^\.?com\.google\.Chrome\.[A-Za-z0-9]{6}$/.test(path.basename(dir))) return null;
	return removeProfile(dir, warn) ? dir : null;
}

/**
 * Launches headless Chrome with a profile and a debugging port of its own, and connects to its first page.
 * Answers the protocol session -- send, on, evaluate -- with the process's pid, its profile and close().
 */
export async function launchChrome({ width = 1600, height = 1000 } = {}) {
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), "input-tester-chrome-"));
	const chrome = launchGroup(process.env.CHROME || "google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--metrics-recording-only", `--window-size=${width},${height}`, `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"]);
	let stopped = false;
	/** Ends Chrome's whole process group, then removes its singleton socket's directory and its profile; idempotent, and never throws. */
	const stop = async () => {
		if (stopped) return;
		stopped = true;
		try {
			await chrome.stop();
		} finally {
			removeSingleton(profile);
			removeProfile(profile);
		}
	};
	try {
		let port = null;
		for (let i = 0; i < 300 && port === null; i++) {
			if (chrome.exited() !== null) throw new Error(`Chrome exited before it listened: ${JSON.stringify(chrome.exited())}`);
			try {
				port = Number(fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]) || null;
			} catch {
				await sleep(50);
			}
		}
		if (port === null) throw new Error("Chrome wrote no DevToolsActivePort");
		let target;
		for (let i = 0; i < 100 && !target; i++) {
			try {
				target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
			} catch {
				await sleep(50);
			}
		}
		if (!target) throw new Error("Chrome showed no page target");
		const session = await connect(target.webSocketDebuggerUrl);
		const close = async () => {
			try {
				session.close();
			} finally {
				await stop();
			}
		};
		return { ...session, pid: chrome.child.pid, profile, port, close };
	} catch (error) {
		await stop();
		throw error;
	}
}

/**
 * A DevTools protocol session over Node.js's global WebSocket: send(method, params) answers the result or
 * throws the protocol's error; on(method, listener) hands every event of that method to the listener.
 */
async function connect(url) {
	const socket = new WebSocket(url);
	await new Promise((resolve, reject) => {
		socket.addEventListener("open", resolve, { once: true });
		socket.addEventListener("error", () => reject(new Error(`could not connect to ${url}`)), { once: true });
	});
	let next = 0;
	const pending = new Map();
	const listeners = new Map();
	socket.addEventListener("message", (message) => {
		const data = JSON.parse(String(message.data));
		if (data.id === undefined) {
			for (const listener of listeners.get(data.method) ?? []) listener(data.params, data.sessionId);
			return;
		}
		const waiting = pending.get(data.id);
		if (!waiting) return;
		pending.delete(data.id);
		if (data.error) waiting.reject(new Error(`${waiting.method}: ${data.error.message}`));
		else waiting.resolve(data.result);
	});
	/** Sends one command, to the page, or to the target a flattened `Target.attachToTarget` named by `sessionId`. */
	const send = (method, params = {}, sessionId = undefined) =>
		new Promise((resolve, reject) => {
			const id = ++next;
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(new Error(`${method}: no answer in 15 seconds`));
			}, 15000);
			pending.set(id, { method, resolve: (v) => (clearTimeout(timer), resolve(v)), reject: (e) => (clearTimeout(timer), reject(e)) });
			socket.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
		});
	/** Hands every protocol event named `method` to `listener`; answers a function that stops it. */
	const on = (method, listener) => {
		if (!listeners.has(method)) listeners.set(method, new Set());
		listeners.get(method).add(listener);
		return () => listeners.get(method).delete(listener);
	};
	/** Evaluates an expression in the page, answering its value. */
	const evaluate = async (expression) => {
		const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
		if (exceptionDetails) throw new Error(`the page threw: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
		return result.value;
	};
	/** Closes the socket and fails every call still waiting; never throws. */
	const close = () => {
		try {
			socket.close();
		} catch {
			// already closed
		} finally {
			for (const [id, waiting] of pending) {
				pending.delete(id);
				waiting.reject(new Error(`${waiting.method}: the session closed`));
			}
		}
	};
	return { socket, send, on, evaluate, close };
}
