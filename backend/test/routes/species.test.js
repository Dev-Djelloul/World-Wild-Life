import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { listSpecies, getSpecies } from "../../src/routes/species.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function request(url) {
	return new Request(url);
}

describe("listSpecies", () => {
	it("retourne toutes les espèces paginées avec les valeurs par défaut", async () => {
		const res = await listSpecies(request("https://api/species"), env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.total).toBe(6);
		expect(body.page).toBe(1);
		expect(body.species).toHaveLength(6);
	});

	it("filtre par habitat", async () => {
		const res = await listSpecies(request("https://api/species?habitat=Savane"), env);
		const body = await res.json();

		expect(body.total).toBe(2);
		expect(body.species.every(s => s.habitat === "Savane")).toBe(true);
	});

	it("filtre par régime alimentaire", async () => {
		const res = await listSpecies(request("https://api/species?diet=Herbivore"), env);
		const body = await res.json();

		expect(body.total).toBe(2);
		expect(body.species.map(s => s.name_common).sort()).toEqual(["Girafe", "Kangourou roux"]);
	});

	it("filtre par statut de conservation", async () => {
		const res = await listSpecies(request("https://api/species?status=VU"), env);
		const body = await res.json();

		expect(body.total).toBe(3);
	});

	it("filtre par région", async () => {
		const res = await listSpecies(request("https://api/species?region_id=2"), env);
		const body = await res.json();

		expect(body.total).toBe(2);
		expect(body.species.map(s => s.name_common).sort()).toEqual(["Kangourou roux", "Ornithorynque"]);
	});

	it("combine plusieurs filtres", async () => {
		const res = await listSpecies(request("https://api/species?habitat=Savane&diet=Carnivore"), env);
		const body = await res.json();

		expect(body.total).toBe(1);
		expect(body.species[0].name_common).toBe("Lion");
	});

	it("pagine correctement (limit + offset)", async () => {
		const res = await listSpecies(request("https://api/species?page=2&limit=2"), env);
		const body = await res.json();

		expect(body.page).toBe(2);
		expect(body.pages).toBe(3);
		expect(body.species).toHaveLength(2);
	});

	it("plafonne limit à 100 et ignore les valeurs invalides", async () => {
		const res = await listSpecies(request("https://api/species?limit=9999&page=abc"), env);
		const body = await res.json();

		expect(body.page).toBe(1);
		expect(body.species.length).toBeLessThanOrEqual(100);
	});
});

describe("getSpecies", () => {
	it("retourne le détail d'une espèce avec ses régions", async () => {
		const res = await getSpecies("1", env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.name_common).toBe("Lion");
		expect(body.regions).toHaveLength(1);
		expect(body.regions[0].name).toBe("Afrique");
	});

	it("retourne un tableau de régions vide si l'espèce n'a aucune région associée", async () => {
		const res = await getSpecies("6", env);
		const body = await res.json();

		expect(body.regions).toEqual([]);
	});

	it("retourne 404 si l'espèce n'existe pas", async () => {
		const res = await getSpecies("9999", env);
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toBeDefined();
	});
});
