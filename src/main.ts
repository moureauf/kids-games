import "./style.css";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("#app missing");

app.innerHTML = `
	<section class="hub">
		<h1>Kids games</h1>
	</section>
`;
