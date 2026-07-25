import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { getStats } from "../../src/routes/stats.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function request(url) {
	return new Request(url);
}

describe("getStats", () => {
	it("calcule les statistiques globales", async () => {
		const res = await getStats(request("https://api/stats"), env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.total_species).toBe(6);
		expect(body.by_status.VU).toBe(3);
		expect(body.by_habitat.Savane).toBe(2);
		expect(body.by_diet.Herbivore).toBe(2);
	});

	it("sert la réponse depuis le cache KV au second appel", async () => {
		await getStats(request("https://api/stats"), env);

		const res = await getStats(request("https://api/stats"), env);
		const body = await res.json();

		expect(body.cached).toBe(true);
		expect(body.total_species).toBe(6);
	});
});
