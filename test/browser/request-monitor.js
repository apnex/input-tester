// request-monitor - the containment monitor's witness (docs/ARCHITECTURE-TARGET.md section 8, Containment): every
// request a Chrome session makes, from the moment it is called, a request the browser rule refused among them.
// It loads nothing at import time -- no built file and no part -- so the operator's deploy, whose smoke run uses
// it, runs from a checkout never built.

/**
 * Watches every request a Chrome session makes, from the moment it is called: each `Network.requestWillBeSent`,
 * a request the browser rule refused among them, with `loadingFailed`'s reason beside it.
 */
export function watchRequests(chrome) {
	const requests = [];
	const byId = new Map();
	chrome.on("Network.requestWillBeSent", (p) => {
		const record = { url: p.request.url, type: p.type, blocked: null };
		byId.set(p.requestId, record);
		requests.push(record);
	});
	chrome.on("Network.loadingFailed", (p) => {
		const record = byId.get(p.requestId);
		if (record) record.blocked = p.blockedReason ?? p.errorText ?? "failed";
	});
	return requests;
}
