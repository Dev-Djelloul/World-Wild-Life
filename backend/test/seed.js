import schemaSql from "../db/schema.sql?raw";
import fixturesSql from "./fixtures.sql?raw";

function splitStatements(sql) {
	return sql
		.split(";")
		.map(s => s.trim())
		.filter(Boolean);
}

export async function seedTestDb(env) {
	for (const statement of splitStatements(schemaSql)) {
		await env.DB.prepare(statement).run();
	}
	for (const statement of splitStatements(fixturesSql)) {
		await env.DB.prepare(statement).run();
	}
}
