// The settings panel, for grown-ups only (it opens behind the parent gate),
// so plain text is fine here. A modal dialog: Escape or "Done" closes it,
// and focus goes back to where it was.
import { getSettings, onSettingsChange, setSetting } from "../settings";

export function openSettingsPanel(
	returnFocus?: HTMLElement,
): HTMLDialogElement {
	const previousFocus =
		returnFocus ??
		(document.activeElement instanceof HTMLElement
			? document.activeElement
			: undefined);

	const dialog = document.createElement("dialog");
	dialog.className = "settings-panel";
	dialog.setAttribute("aria-labelledby", "settings-title");
	dialog.innerHTML = `
		<h2 id="settings-title">Settings</h2>
		<p class="settings-note">For grown-ups. Saved on this device only.</p>
		<div class="setting">
			<span class="setting-text">
				<span id="setting-french-label" class="setting-label">French words</span>
				<span id="setting-french-hint" class="setting-hint">Games also say words in French, e.g. “la vache”.</span>
			</span>
			<button type="button" class="switch" role="switch"
				aria-labelledby="setting-french-label"
				aria-describedby="setting-french-hint">
				<span class="switch-knob" aria-hidden="true"></span>
			</button>
		</div>
		<button type="button" class="settings-done">Done</button>`;

	const toggle = dialog.querySelector<HTMLButtonElement>(".switch");
	const done = dialog.querySelector<HTMLButtonElement>(".settings-done");
	if (!toggle || !done) throw new Error("settings panel markup");

	const show = (french: boolean) =>
		toggle.setAttribute("aria-checked", String(french));
	show(getSettings().french);
	const unsubscribe = onSettingsChange((s) => show(s.french));

	toggle.addEventListener("click", () => {
		setSetting("french", toggle.getAttribute("aria-checked") !== "true");
	});
	done.addEventListener("click", () => dialog.close());
	// Escape fires `cancel`, then `close`.
	dialog.addEventListener("close", () => {
		unsubscribe();
		dialog.remove();
		if (previousFocus?.isConnected) previousFocus.focus();
	});

	document.body.append(dialog);
	dialog.showModal();
	toggle.focus();
	return dialog;
}
