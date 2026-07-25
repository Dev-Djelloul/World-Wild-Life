import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLiveWikidata } from "../../src/routes/wikidata.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function searchResponse(id = "Q140") {
	return new Response(JSON.stringify({ search: [{ id }] }), { status: 200 });
}

function entityResponse({ image = "Lion.jpg", iucnEntityId = "Q278113" } = {}) {
	return new Response(
		JSON.stringify({
			entities: {
				Q140: {
					labels: { en: { value: "lion" } },
					claims: {
						P18: [{ mainsnak: { datavalue: { value: image } } }],
						P141: [{ mainsnak: { datavalue: { value: { id: iucnEntityId } } } }],
					},
				},
			},
		}),
		{ status: 200 }
	);
}

function labelResponse(id, label) {
	return new Response(JSON.stringify({ entities: { [id]: { labels: { en: { value: label } } } } }), { status: 200 });
}

describe("getLiveWikidata", () => {
	it("retourne 404 si l'espèce n'existe pas", async () => {
		const res = await getLiveWikidata("9999", env);
		expect(res.status).toBe(404);
	});

	it("récupère l'entité Wikidata, l'image et le statut IUCN croisé, et met en cache", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(searchResponse())
			.mockResolvedValueOnce(entityResponse())
			.mockResolvedValueOnce(labelResponse("Q278113", "vulnerable species"));
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveWikidata("1", env);
		const body = await res.json();

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(body.wikidata_id).toBe("Q140");
		expect(body.image_url).toContain("Lion.jpg");
		expect(body.iucn_status_wikidata).toBe("vulnerable species");
		expect(body.cached).toBe(false);

		vi.unstubAllGlobals();
	});

	it("sert la réponse depuis le cache KV sans rappeler l'API", async () => {
		await env.CACHE.put("wikidata:1", JSON.stringify({ wikidata_id: "Q140" }));

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveWikidata("1", env);
		const body = await res.json();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(body.cached).toBe(true);

		vi.unstubAllGlobals();
	});

	it("répond sans données si aucune entité Wikidata n'est trouvée", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ search: [] }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveWikidata("2", env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.wikidata_id).toBeUndefined();
		expect(body.message).toBeDefined();

		vi.unstubAllGlobals();
	});
});
