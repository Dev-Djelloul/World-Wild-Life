import { withCors, corsHeaders } from "../middleware/cors.js";
import { listSpecies, getSpecies } from "./routes/species.js";
import { listRegions, getRegionSpecies } from "./routes/regions.js";
import { searchSpecies } from "./routes/search.js";
import { listFilters } from "./routes/filters.js";
import { getStats } from "./routes/stats.js";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url;

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		const speciesIdMatch = pathname.match(/^\/species\/(\d+)$/);
		const regionSpeciesMatch = pathname.match(/^\/regions\/(\d+)\/species$/);

		let response;
		if (pathname === "/species" && request.method === "GET") {
			response = await listSpecies(request, env);
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
};
