import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { searchSpecies } from "../../src/routes/search.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function request(url) {
	return new Request(url);
}

describe("searchSpecies", () => {
	it("rejette une requête de moins de 2 caractères", async () => {
		const res = await searchSpecies(request("https://api/search?q=a"), env);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBeDefined();
	});

	it("rejette une requête absente", async () => {
		const res = await searchSpecies(request("https://api/search"), env);
		expect(res.status).toBe(400);
	});

	it("trouve une espèce par nom commun", async () => {
		const res = await searchSpecies(request("https://api/search?q=Lion"), env);
		const body = await res.json();

		expect(body.count).toBe(1);
		expect(body.results[0].name_common).toBe("Lion");
	});

	it("trouve une espèce par nom scientifique", async () => {
		const res = await searchSpecies(request("https://api/search?q=Panthera"), env);
		const body = await res.json();

		expect(body.count).toBe(1);
		expect(body.results[0].name_scientific).toBe("Panthera leo");
	});

	it("trouve par habitat", async () => {
		const res = await searchSpecies(request("https://api/search?q=Savane"), env);
		const body = await res.json();

		expect(body.count).toBe(2);
	});

	it("trouve par mot présent dans la description", async () => {
		const res = await searchSpecies(request("https://api/search?q=marsupial"), env);
		const body = await res.json();

		expect(body.count).toBe(1);
		expect(body.results[0].name_common).toBe("Kangourou roux");
	});

	it("respecte le paramètre limit", async () => {
		const res = await searchSpecies(request("https://api/search?q=an&limit=2"), env);
		const body = await res.json();

		expect(body.results.length).toBeLessThanOrEqual(2);
	});

	it("retourne un tableau vide si rien ne correspond", async () => {
		const res = await searchSpecies(request("https://api/search?q=zzzzzzz"), env);
		const body = await res.json();

		expect(body.count).toBe(0);
		expect(body.results).toEqual([]);
	});
});
