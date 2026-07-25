import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { listRegions, getRegionSpecies } from "../../src/routes/regions.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function request(url) {
	return new Request(url);
}

describe("listRegions", () => {
	it("liste toutes les régions", async () => {
		const res = await listRegions(request("https://api/regions"), env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.regions).toHaveLength(2);
		expect(body.regions.map(r => r.name).sort()).toEqual(["Afrique", "Océanie"]);
	});

	it("sert la réponse depuis le cache KV au second appel", async () => {
		await listRegions(request("https://api/regions"), env);

		const res = await listRegions(request("https://api/regions"), env);
		const body = await res.json();

		expect(body.cached).toBe(true);
	});
});

describe("getRegionSpecies", () => {
	it("liste les espèces d'une région, paginé", async () => {
		const res = await getRegionSpecies("1", request("https://api/regions/1/species"), env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.region).toBe("Afrique");
		expect(body.total).toBe(2);
		expect(body.species.map(s => s.name_common).sort()).toEqual(["Girafe", "Lion"]);
	});

	it("retourne 404 si la région n'existe pas", async () => {
		const res = await getRegionSpecies("9999", request("https://api/regions/9999/species"), env);
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toBeDefined();
	});

	it("retourne une liste vide pour une région sans espèce", async () => {
		const res = await getRegionSpecies("2", request("https://api/regions/2/species?limit=1"), env);
		const body = await res.json();

		expect(body.total).toBe(2);
		expect(body.species).toHaveLength(1);
		expect(body.pages).toBe(2);
	});
});
