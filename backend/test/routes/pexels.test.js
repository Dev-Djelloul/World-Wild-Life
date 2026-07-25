import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLivePhotos } from "../../src/routes/pexels.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

function pexelsResponse() {
	return new Response(
		JSON.stringify({
			photos: [
				{
					src: { medium: "https://images.pexels.com/photos/1/lion-medium.jpg" },
					width: 1280,
					height: 720,
					photographer: "Jane Doe",
					url: "https://www.pexels.com/photo/1",
				},
			],
		}),
		{ status: 200 }
	);
}

describe("getLivePhotos", () => {
	it("retourne 503 si PEXELS_API_KEY n'est pas configuré", async () => {
		const res = await getLivePhotos("1", { ...env, PEXELS_API_KEY: undefined });
		expect(res.status).toBe(503);
	});

	it("retourne 404 si l'espèce n'existe pas", async () => {
		const res = await getLivePhotos("9999", { ...env, PEXELS_API_KEY: "test-key" });
		expect(res.status).toBe(404);
	});

	it("récupère des photos Pexels et les met en cache", async () => {
		const fetchMock = vi.fn().mockResolvedValue(pexelsResponse());
		vi.stubGlobal("fetch", fetchMock);

		const testEnv = { ...env, PEXELS_API_KEY: "test-key" };
		const res = await getLivePhotos("1", testEnv);
		const body = await res.json();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(body.photos).toHaveLength(1);
		expect(body.photos[0].photographer).toBe("Jane Doe");
		expect(body.cached).toBe(false);

		const cached = await testEnv.CACHE.get("pexels:1", "json");
		expect(cached).toHaveLength(1);

		vi.unstubAllGlobals();
	});

	it("sert la réponse depuis le cache KV sans rappeler l'API", async () => {
		const testEnv = { ...env, PEXELS_API_KEY: "test-key" };
		await testEnv.CACHE.put("pexels:1", JSON.stringify([{ url: "https://example.com/cached.jpg" }]));

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLivePhotos("1", testEnv);
		const body = await res.json();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(body.cached).toBe(true);
		expect(body.photos[0].url).toBe("https://example.com/cached.jpg");

		vi.unstubAllGlobals();
	});

	it("retourne un tableau vide si Pexels ne renvoie aucun résultat", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ photos: [] }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLivePhotos("2", { ...env, PEXELS_API_KEY: "test-key" });
		const body = await res.json();

		expect(body.photos).toEqual([]);

		vi.unstubAllGlobals();
	});
});
