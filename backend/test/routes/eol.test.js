import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLiveEol } from "../../src/routes/eol.js";
import { seedTestDb } from "../seed.js";

beforeEach(async () => {
	await seedTestDb(env);
});

describe("getLiveEol", () => {
	it("retourne 404 si l'espèce n'existe pas", async () => {
		const res = await getLiveEol("9999", env);
		expect(res.status).toBe(404);
	});

	it("récupère le lien de la fiche EOL et met en cache", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({ results: [{ id: 328672, title: "Panthera leo", link: "https://eol.org/pages/328672" }] }),
				{ status: 200 }
			)
		);
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveEol("1", env);
		const body = await res.json();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(body.eol_page_id).toBe(328672);
		expect(body.eol_page_url).toBe("https://eol.org/pages/328672");
		expect(body.cached).toBe(false);

		vi.unstubAllGlobals();
	});

	it("sert la réponse depuis le cache KV sans rappeler l'API", async () => {
		await env.CACHE.put("eol:1", JSON.stringify({ eol_page_id: 328672 }));

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveEol("1", env);
		const body = await res.json();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(body.cached).toBe(true);

		vi.unstubAllGlobals();
	});

	it("répond sans fiche si EOL ne trouve aucun résultat", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const res = await getLiveEol("2", env);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.eol_page_id).toBeUndefined();
		expect(body.message).toBeDefined();

		vi.unstubAllGlobals();
	});
});
