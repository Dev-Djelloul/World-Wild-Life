INSERT INTO REGIONS (id, name, latitude, longitude, description) VALUES
	(1, 'Afrique', -6.369, 34.888, 'Région test Afrique'),
	(2, 'Océanie', -25.274, 133.775, 'Région test Océanie');

INSERT INTO SPECIES (id, name_common, name_scientific, kingdom, phylum, class, habitat, diet, conservation_status, population_trend, description, image_url) VALUES
	(1, 'Lion', 'Panthera leo', 'Animalia', 'Chordata', 'Mammalia', 'Savane', 'Carnivore', 'VU', 'Decreasing', 'Grand félin social vivant en groupes appelés prides.', 'https://example.com/lion.jpg'),
	(2, 'Girafe', 'Giraffa camelopardalis', 'Animalia', 'Chordata', 'Mammalia', 'Savane', 'Herbivore', 'VU', 'Decreasing', 'Le plus grand mammifère terrestre, reconnaissable à son long cou.', 'https://example.com/girafe.jpg'),
	(3, 'Kangourou roux', 'Osphranter rufus', 'Animalia', 'Chordata', 'Mammalia', 'Désert', 'Herbivore', 'LC', 'Stable', 'Le plus grand marsupial vivant, endémique d''Australie.', 'https://example.com/kangourou.jpg'),
	(4, 'Requin blanc', 'Carcharodon carcharias', 'Animalia', 'Chordata', 'Chondrichthyes', 'Océan', 'Carnivore', 'VU', 'Decreasing', 'Grand prédateur marin présent dans la plupart des océans.', 'https://example.com/requin.jpg'),
	(5, 'Ornithorynque', 'Ornithorhynchus anatinus', 'Animalia', 'Chordata', 'Mammalia', 'Forêt tempérée', 'Omnivore', 'NT', 'Decreasing', 'Mammifère semi-aquatique pondant des œufs, endémique d''Australie.', 'https://example.com/ornithorynque.jpg'),
	(6, 'Espèce sans région', 'Testus nullregionus', 'Animalia', 'Chordata', 'Mammalia', 'Toundra', 'Omnivore', 'DD', 'Unknown', 'Espèce fictive utilisée pour tester l''absence de région associée.', 'https://example.com/test.jpg');

INSERT INTO SPECIES_REGIONS (species_id, region_id, presence) VALUES
	(1, 1, 'Resident'),
	(2, 1, 'Resident'),
	(3, 2, 'Resident'),
	(5, 2, 'Resident');
