DROP TABLE IF EXISTS SPECIES_REGIONS;
DROP TABLE IF EXISTS SPECIES;
DROP TABLE IF EXISTS REGIONS;

CREATE TABLE SPECIES (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name_common TEXT NOT NULL,
	name_scientific TEXT UNIQUE,
	kingdom TEXT,
	phylum TEXT,
	class TEXT,
	habitat TEXT,
	diet TEXT,
	conservation_status TEXT,
	population_trend TEXT,
	description TEXT,
	image_url TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE REGIONS (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	latitude FLOAT,
	longitude FLOAT,
	description TEXT
);

CREATE TABLE SPECIES_REGIONS (
	species_id INTEGER NOT NULL REFERENCES SPECIES(id),
	region_id INTEGER NOT NULL REFERENCES REGIONS(id),
	presence TEXT,
	PRIMARY KEY (species_id, region_id)
);

CREATE INDEX idx_species_habitat ON SPECIES(habitat);
CREATE INDEX idx_species_diet ON SPECIES(diet);
CREATE INDEX idx_species_status ON SPECIES(conservation_status);
CREATE INDEX idx_species_name_common ON SPECIES(name_common);
