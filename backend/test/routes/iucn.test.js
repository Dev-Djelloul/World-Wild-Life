import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLiveIucnStatus } from "../../src/routes/iucn.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function iucnAssessmentResponse(overrides = {}) {
	return {
		assessments: [
			{
				latest: true,
				scopes: [{ code: "1" }],
				red_list_category_code: "VU",
				year_published: 2023,
				url: "https://iucnredlist.org/species/1",
				...overrides,
			},
		],
	};
}

describe("getLiveIucnStatus", () => {
	it("retourne 503 si IUCN_API_TOKEN n'est pas configuré", async () => {
		const res = await getLiveIucnStatus("1", { ...env, IUCN_API_TOKEN: undefined });
		expect(res.status).toBe(503);
	});

	it("retourne 404 si l'espèce n'existe pas", async () => {
		const res = await getLiveIucnStatus("9999", { ...env, IUCN_API_TOKEN: "test-token" });
		expect(res.status).toBe(404);
	});

	it("récupère le statut IUCN et le met en cache", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(iucnAssessmentResponse()), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const testEnv = { ...env, IUCN_API_TOKEN: "test-token" };
		const res = await getLiveIucnStatus("1", testEnv);
		const body = await res.json();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(body.iucn_status).toBe("VU");
		expect(body.cached).toBe(false);

		const cached = await testEnv.CACHE.get("iucn:1", "json");
		expect(cached.iucn_status).toBe("VU");

		vi.unstubAllGlobals();
	});

	it("sert la réponse depuis le cache KV sans rappeler l'API", async () => {
		const testEnv = { ...env, IUCN_API_TOKEN: "test-token" };
		await testEnv.CACHE.put("iucn:1", JSON.stringify({ iucn_status: "EN", name_common: "Lion" }));

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveIucnStatus("1", testEnv);
		const body = await res.json();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(body.iucn_status).toBe("EN");
		expect(body.cached).toBe(true);

		vi.unstubAllGlobals();
	});

	it("répond sans statut si l'API IUCN ne trouve aucune évaluation", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
		vi.stubGlobal("fetch", fetchMock);

		// espèce 2 (pas encore mise en cache par un test précédent de ce fichier)
		const res = await getLiveIucnStatus("2", { ...env, IUCN_API_TOKEN: "test-token" });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.iucn_status).toBeNull();
		expect(body.message).toBeDefined();

		vi.unstubAllGlobals();
	});
});
