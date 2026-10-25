// fake-platform - a platform of plain objects for the tester's composition root, so a test drives the very
// composition the page runs -- `input-capture` opened over fakes, as its README's test section shows, and
// `vector-scene` on a root of plain objects -- with events of the platform's shape, the fixture rows' among
// them: a move whose `buttons` the platform leaves out, a button above 4, a key event naming no `code`.
//
// Every element the scene makes records each write, and whether it was made while a listener of the capture
// was running, so a test sees which writes happened inside an input's delivery (GT2).

/** A fake element of the scene's slice (VS1): it records its tag, attributes, children and text, and every write. */
function fakeElement(tag, platform) {
	const element = {
		tag,
		attributes: new Map(),
		children: [],
		parent: null,
		text: "",
		setAttribute(name, value) {
			platform.write("setAttribute", tag, name, value);
			element.attributes.set(name, value);
		},
		removeAttribute(name) {
			platform.write("removeAttribute", tag, name);
			element.attributes.delete(name);
		},
		appendChild(child) {
			platform.write("appendChild", tag, child.tag);
			if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
			child.parent = element;
			element.children.push(child);
		},
		insertBefore(child, before) {
			platform.write("insertBefore", tag, child.tag);
			if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
			child.parent = element;
			const i = before === null ? -1 : element.children.indexOf(before);
			if (i === -1) element.children.push(child);
			else element.children.splice(i, 0, child);
		},
		remove() {
			platform.write("remove", tag);
			if (element.parent) element.parent.children.splice(element.parent.children.indexOf(element), 1);
			element.parent = null;
		},
		set textContent(value) {
			platform.write("textContent", tag, value);
			element.text = value;
		},
		get textContent() {
			return element.text;
		},
	};
	return element;
}

/** The identity transform, as the root's getScreenCTM answers one: screen and drawing coordinates are the same. */
function identityMatrix() {
	const m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => identityMatrix() };
	return m;
}

/**
 * A platform for composeTesterPage: `surface` the root and pointer surface, `keySource` the window, `address` and
 * `browser`; and the means to dispatch events -- `pointer`, `key`, `wheel`, `menu`, `blur` -- each answering what the
 * delivery asked of the platform: whether the event was claimed and whether the pointer was taken.
 */
export function fakePlatform({ address = "https://input.example/", brands = ["Chromium", "Google Chrome"], keyboardMap = null } = {}) {
	const surfaceListeners = new Map();
	const keyListeners = new Map();
	const writes = [];
	let inside = 0;
	let time = 1000;
	const platform = {
		writes,
		write: (op, ...args) => writes.push({ op, args, insideDelivery: inside > 0 }),
	};
	const document = {
		createElementNS: (namespace, tag) => fakeElement(tag, platform),
		elementsFromPoint: () => [],
	};
	const root = fakeElement("svg", platform);
	const surface = Object.assign(root, {
		ownerDocument: document,
		getScreenCTM: () => identityMatrix(),
		addEventListener: (name, listener) => surfaceListeners.set(name, listener),
		removeEventListener: (name) => surfaceListeners.delete(name),
		setPointerCapture: (pointerId) => {
			platform.captured = pointerId;
		},
	});
	const keySource = {
		addEventListener: (name, listener) => keyListeners.set(name, listener),
		removeEventListener: (name) => keyListeners.delete(name),
	};
	const browser = { userAgentData: brands === null ? undefined : { brands: brands.map((brand) => ({ brand })) } };
	if (keyboardMap !== null) browser.keyboard = { getLayoutMap: async () => new Map(Object.entries(keyboardMap)) };

	/** Dispatches one event to a listener, inside a delivery; answers whether it was claimed and whether the pointer was taken. */
	const dispatch = (listeners, name, fields) => {
		const listener = listeners.get(name);
		if (!listener) throw new Error(`fake-platform: no listener for ${name}`);
		let claimed = false;
		platform.captured = undefined;
		time += 10;
		const event = { timeStamp: time, target: null, preventDefault: () => (claimed = true), ...fields };
		inside++;
		try {
			listener(event);
		} finally {
			inside--;
		}
		return { claimed, taken: platform.captured !== undefined };
	};
	const POINTER_EVENTS = { down: "pointerdown", move: "pointermove", up: "pointerup", cancel: "pointercancel", over: "pointerover", out: "pointerout", leave: "pointerleave", double: "dblclick" };
	return {
		surface,
		keySource,
		address,
		browser,
		writes,
		root,
		/** A pointer event of the family named, at a screen point, its fields as given; a mouse's pointer 1 by default. */
		pointer: (type, fields = {}) => dispatch(surfaceListeners, POINTER_EVENTS[type], { clientX: 0, clientY: 0, button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", ...fields }),
		/** A key event: `key-down` or `key-up`. */
		key: (type, fields = {}) => dispatch(keyListeners, type === "key-down" ? "keydown" : "keyup", { key: "", code: "", repeat: false, ...fields }),
		/** A wheel event, its deltas as given. */
		wheel: (fields = {}) => dispatch(surfaceListeners, "wheel", { clientX: 0, clientY: 0, button: 0, buttons: 0, deltaX: 0, deltaY: 0, deltaZ: 0, deltaMode: 0, ...fields }),
		/** A context menu event. */
		menu: (fields = {}) => dispatch(surfaceListeners, "contextmenu", { clientX: 0, clientY: 0, button: 2, buttons: 2, pointerId: 1, pointerType: "mouse", ...fields }),
		/** The key source's focus loss. */
		blur: () => dispatch(keyListeners, "blur", {}),
		/** Every element under the root, depth first, with its tag and attributes. */
		elements: () => {
			const out = [];
			const walk = (e) => {
				for (const c of e.children) {
					out.push(c);
					walk(c);
				}
			};
			walk(root);
			return out;
		},
	};
}
