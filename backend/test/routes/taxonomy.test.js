import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLiveTaxonomy } from "../../src/routes/taxonomy.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function ncbiEsearchResponse(taxId = "9689") {
	return new Response(JSON.stringify({ esearchresult: { idlist: [taxId] } }), { status: 200 });
}

function ncbiEfetchXml({ kingdom = "Metazoa", phylum = "Chordata", class_ = "Mammalia" } = {}) {
	return new Response(
		`<?xml version="1.0"?>
		<TaxaSet>
			<Taxon>
				<TaxId>9689</TaxId>
				<ScientificName>Panthera leo</ScientificName>
				<LineageEx>
					<Taxon><TaxId>1</TaxId><ScientificName>${kingdom}</ScientificName><Rank>kingdom</Rank></Taxon>
					<Taxon><TaxId>2</TaxId><ScientificName>${phylum}</ScientificName><Rank>phylum</Rank></Taxon>
					<Taxon><TaxId>3</TaxId><ScientificName>${class_}</ScientificName><Rank>class</Rank></Taxon>
				</LineageEx>
			</Taxon>
		</TaxaSet>`,
		{ status: 200 }
	);
}

describe("getLiveTaxonomy", () => {
	it("retourne 404 si l'espèce n'existe pas", async () => {
		const res = await getLiveTaxonomy("9999", env);
		expect(res.status).toBe(404);
	});

	it("récupère la taxonomie depuis NCBI, normalise Metazoa en Animalia, et met en cache", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(ncbiEsearchResponse())
			.mockResolvedValueOnce(ncbiEfetchXml());
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveTaxonomy("1", env);
		const body = await res.json();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(body.kingdom).toBe("Animalia");
		expect(body.phylum).toBe("Chordata");
		expect(body.class).toBe("Mammalia");
		expect(body.cached).toBe(false);

		const cached = await env.CACHE.get("taxonomy:1", "json");
		expect(cached.class).toBe("Mammalia");

		vi.unstubAllGlobals();
	});

	it("sert la réponse depuis le cache KV sans rappeler l'API", async () => {
		await env.CACHE.put("taxonomy:1", JSON.stringify({ kingdom: "Animalia", phylum: "Chordata", class: "Mammalia" }));

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveTaxonomy("1", env);
		const body = await res.json();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(body.cached).toBe(true);
		expect(body.class).toBe("Mammalia");

		vi.unstubAllGlobals();
	});

	it("répond sans taxonomie si NCBI ne trouve aucun taxon", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ esearchresult: { idlist: [] } }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveTaxonomy("2", env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.kingdom).toBeUndefined();
		expect(body.message).toBeDefined();

		vi.unstubAllGlobals();
	});

	it("répond sans taxonomie si la requête esearch échoue", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveTaxonomy("3", env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.message).toBeDefined();

		vi.unstubAllGlobals();
	});
});
