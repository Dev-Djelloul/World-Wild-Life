import { withCors, corsHeaders } from "../middleware/cors.js";
import { listSpecies, getSpecies } from "./routes/species.js";
import { listRegions, getRegionSpecies } from "./routes/regions.js";
import { searchSpecies } from "./routes/search.js";
import { listFilters } from "./routes/filters.js";
import { getStats } from "./routes/stats.js";
import { getLiveIucnStatus, syncAllIucnStatuses } from "./routes/iucn.js";
import { getLiveTaxonomy, syncAllTaxonomies } from "./routes/taxonomy.js";
import { getLiveWikidata } from "./routes/wikidata.js";
import { getLiveEol } from "./routes/eol.js";
import { getLivePhotos } from "./routes/pexels.js";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url;

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		const speciesIdMatch = pathname.match(/^\/species\/(\d+)$/);
		const speciesIucnMatch = pathname.match(/^\/species\/(\d+)\/iucn$/);
		const speciesTaxonomyMatch = pathname.match(/^\/species\/(\d+)\/taxonomy$/);
		const speciesWikidataMatch = pathname.match(/^\/species\/(\d+)\/wikidata$/);
		const speciesEolMatch = pathname.match(/^\/species\/(\d+)\/eol$/);
		const speciesPhotosMatch = pathname.match(/^\/species\/(\d+)\/photos$/);
		const regionSpeciesMatch = pathname.match(/^\/regions\/(\d+)\/species$/);

		let response;
		if (pathname === "/species" && request.method === "GET") {
			response = await listSpecies(request, env);
		} else if (speciesIucnMatch && request.method === "GET") {
			response = await getLiveIucnStatus(speciesIucnMatch[1], env);
		} else if (speciesTaxonomyMatch && request.method === "GET") {
			response = await getLiveTaxonomy(speciesTaxonomyMatch[1], env);
		} else if (speciesWikidataMatch && request.method === "GET") {
			response = await getLiveWikidata(speciesWikidataMatch[1], env);
		} else if (speciesEolMatch && request.method === "GET") {
			response = await getLiveEol(speciesEolMatch[1], env);
		} else if (speciesPhotosMatch && request.method === "GET") {
			response = await getLivePhotos(speciesPhotosMatch[1], env);
		} else if (speciesIdMatch && request.method === "GET") {
			response = await getSpecies(speciesIdMatch[1], env);
		} else if (pathname === "/search" && request.method === "GET") {
			response = await searchSpecies(request, env);
		} else if (regionSpeciesMatch && request.method === "GET") {
			response = await getRegionSpecies(regionSpeciesMatch[1], request, env);
		} else if (pathname === "/regions" && request.method === "GET") {
			response = await listRegions(request, env);
		} else if (pathname === "/filters" && request.method === "GET") {
			response = await listFilters(request, env);
		} else if (pathname === "/stats" && request.method === "GET") {
			response = await getStats(request, env);
		} else {
			response = Response.json({ message: "World Wild Life API" }, { status: 200 });
		}

		return withCors(response);
	},

	// Cron Triggers (voir wrangler.toml) : resynchronise périodiquement les statuts IUCN
	// et la taxonomie (kingdom/phylum/class) via NCBI Taxonomy.
	async scheduled(event, env, ctx) {
		if (event.cron === "0 4 * * SUN") {
			ctx.waitUntil(syncAllTaxonomies(env));
		} else {
			ctx.waitUntil(syncAllIucnStatuses(env));
		}
	},
};
