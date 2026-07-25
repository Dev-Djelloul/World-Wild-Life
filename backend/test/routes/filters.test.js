import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { listFilters } from "../../src/routes/filters.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function request(url) {
	return new Request(url);
}

describe("listFilters", () => {
	it("retourne les valeurs distinctes habitat/diet/status", async () => {
		const res = await listFilters(request("https://api/filters"), env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.cached).toBe(false);
		expect(body.habitats.sort()).toEqual(["Désert", "Forêt tempérée", "Océan", "Savane", "Toundra"]);
		expect(body.diets.sort()).toEqual(["Carnivore", "Herbivore", "Omnivore"]);
		expect(body.statuses.sort()).toEqual(["DD", "LC", "NT", "VU"]);
	});

	it("sert la réponse depuis le cache KV au second appel", async () => {
		await listFilters(request("https://api/filters"), env);

		const res = await listFilters(request("https://api/filters"), env);
		const body = await res.json();

		expect(body.cached).toBe(true);
		expect(body.habitats).toBeDefined();
	});
});
