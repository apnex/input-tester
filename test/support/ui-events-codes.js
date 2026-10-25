// ui-events-codes - every code value the UI Events KeyboardEvent code values specification lists, by its
// sections 3.1 to 3.7 (W3C Recommendation, https://www.w3.org/TR/uievents-code/), as test data: the keyboard
// plans' codes are held to it, and a code not in it must be marked as Chromium's own.
export const UI_EVENTS_CODES = Object.freeze([
	// 3.1.1 writing system keys
	"Backquote", "Backslash", "BracketLeft", "BracketRight", "Comma", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Equal", "IntlBackslash", "IntlRo", "IntlYen",
	"KeyA", "KeyB", "KeyC", "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT", "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ", "Minus", "Period", "Quote", "Semicolon", "Slash",
	// 3.1.2 functional keys
	"AltLeft", "AltRight", "Backspace", "CapsLock", "ContextMenu", "ControlLeft", "ControlRight", "Enter", "MetaLeft", "MetaRight", "ShiftLeft", "ShiftRight", "Space", "Tab", "Convert", "KanaMode", "Lang1", "Lang2", "Lang3", "Lang4", "Lang5", "NonConvert",
	// 3.2 control pad, 3.3 arrow pad
	"Delete", "End", "Help", "Home", "Insert", "PageDown", "PageUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp",
	// 3.4 numpad
	"NumLock", "Numpad0", "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7", "Numpad8", "Numpad9", "NumpadAdd", "NumpadBackspace", "NumpadClear", "NumpadClearEntry", "NumpadComma", "NumpadDecimal", "NumpadDivide", "NumpadEnter", "NumpadEqual", "NumpadHash", "NumpadMemoryAdd", "NumpadMemoryClear", "NumpadMemoryRecall", "NumpadMemoryStore", "NumpadMemorySubtract", "NumpadMultiply", "NumpadParenLeft", "NumpadParenRight", "NumpadStar", "NumpadSubtract",
	// 3.5 function section
	"Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Fn", "FnLock", "PrintScreen", "ScrollLock", "Pause",
	// 3.6 media keys
	"BrowserBack", "BrowserFavorites", "BrowserForward", "BrowserHome", "BrowserRefresh", "BrowserSearch", "BrowserStop", "Eject", "LaunchApp1", "LaunchApp2", "LaunchMail", "MediaPlayPause", "MediaSelect", "MediaStop", "MediaTrackNext", "MediaTrackPrevious", "Power", "Sleep", "AudioVolumeDown", "AudioVolumeMute", "AudioVolumeUp", "WakeUp",
	// 3.7 legacy, non-standard and special keys
	"Hyper", "Super", "Turbo", "Abort", "Resume", "Suspend", "Again", "Copy", "Cut", "Find", "Open", "Paste", "Props", "Select", "Undo", "Hiragana", "Katakana", "Unidentified",
]);

/** The codes the code values call seldom reported: the Fn key, "typically a hardware key that does not generate a separate code". */
export const SELDOM_REPORTED_CODES = Object.freeze(["Fn"]);
