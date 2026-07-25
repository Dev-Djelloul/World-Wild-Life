import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index.js";
import { seedTestDb } from "./seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

describe("router", () => {
	it("répond aux requêtes OPTIONS avec les en-têtes CORS", async () => {
		const res = await worker.fetch(new Request("https://api/species", { method: "OPTIONS" }), env);

		expect(res.status).toBe(200);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("route GET /species vers listSpecies", async () => {
		const res = await worker.fetch(new Request("https://api/species"), env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.total).toBe(6);
	});

	it("route GET /species/:id vers getSpecies", async () => {
		const res = await worker.fetch(new Request("https://api/species/1"), env);
		const body = await res.json();

		expect(body.name_common).toBe("Lion");
	});

	it("route GET /regions/:id/species vers getRegionSpecies", async () => {
		const res = await worker.fetch(new Request("https://api/regions/1/species"), env);
		const body = await res.json();

		expect(body.region).toBe("Afrique");
	});

	it("ajoute les en-têtes CORS à toutes les réponses", async () => {
		const res = await worker.fetch(new Request("https://api/stats"), env);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("retourne un message par défaut pour une route inconnue", async () => {
		const res = await worker.fetch(new Request("https://api/nope"), env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.message).toBe("World Wild Life API");
	});
});
