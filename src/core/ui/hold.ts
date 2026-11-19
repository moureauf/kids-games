// Press-and-hold behaviour shared by the home button and the parent gate.
// The button gets the `holding` class while a finger stays down (CSS fills
// a ring over `--hold-ms`). Lifting early, or a short tap, does nothing.

export const holdRingSvg = `
<svg class="hold-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
	<circle cx="50" cy="50" r="45" pathLength="100" />
</svg>`;

export function makeHoldButton(
	button: HTMLButtonElement,
	holdMs: number,
	onHeld: () => void,
): void {
	button.style.setProperty("--hold-ms", `${holdMs}ms`);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const cancel = () => {
		if (timer !== undefined) clearTimeout(timer);
		timer = undefined;
		button.classList.remove("holding");
	};

	const start = () => {
		cancel();
		button.classList.add("holding");
		timer = setTimeout(() => {
			timer = undefined;
			button.classList.remove("holding");
			onHeld();
		}, holdMs);
	};

	button.addEventListener("pointerdown", (event) => {
		if (!event.isPrimary) return;
		event.preventDefault();
		button.setPointerCapture?.(event.pointerId);
		start();
	});
	for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
		button.addEventListener(type, cancel);
	}

	// Keyboard: hold Space or Enter the same way.
	button.addEventListener("keydown", (event) => {
		if (event.key !== " " && event.key !== "Enter") return;
		event.preventDefault();
		if (!event.repeat) start();
	});
	button.addEventListener("keyup", (event) => {
		if (event.key === " " || event.key === "Enter") cancel();
	});
	button.addEventListener("blur", cancel);

	// No long-press menu on iPad.
	button.addEventListener("contextmenu", (event) => event.preventDefault());
}
