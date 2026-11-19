import { describe, expect, it } from "vitest";
import { gameHash, parseRoute } from "../../src/core/router";

const ids = ["sound-safari", "letter-trail"];

describe("parseRoute", () => {
	it("shows the hub for an empty hash or #/", () => {
		expect(parseRoute("", ids)).toEqual({ name: "hub" });
		expect(parseRoute("#", ids)).toEqual({ name: "hub" });
		expect(parseRoute("#/", ids)).toEqual({ name: "hub" });
	});

	it("opens a known game", () => {
		expect(parseRoute("#/sound-safari", ids)).toEqual({
			name: "game",
			id: "sound-safari",
		});
		expect(parseRoute("#/letter-trail/", ids)).toEqual({
			name: "game",
			id: "letter-trail",
		});
	});

	it("sends unknown or malformed routes to the hub", () => {
		expect(parseRoute("#/no-such-game", ids)).toEqual({ name: "hub" });
		expect(parseRoute("#/sound-safari/extra", ids)).toEqual({ name: "hub" });
		expect(parseRoute("#sound-safari", ids)).toEqual({ name: "hub" });
		expect(parseRoute("#/%E0%A4%A", ids)).toEqual({ name: "hub" });
	});

	it("round-trips game ids", () => {
		for (const id of ids) {
			expect(parseRoute(gameHash(id), ids)).toEqual({ name: "game", id });
		}
	});
});
