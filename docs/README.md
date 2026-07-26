# World Wild Life 🌍

Application web interactive pour consulter, filtrer et explorer les espèces animales du monde, leurs habitats, leurs statuts de conservation UICN et leurs zones géographiques.

Cette application a été réalisée avec Claude code.

**En ligne :**
- Frontend : [world-wild-life.netlify.app](https://world-wild-life.netlify.app)
- API : [world-wild-life-api.djelloulabid75.workers.dev](https://world-wild-life-api.djelloulabid75.workers.dev)

Architecture technique détaillée : [ARCHITECTURE.md](ARCHITECTURE.md)

## Stack

- **Frontend** : HTML/CSS/JS vanilla, [Leaflet.js](https://leafletjs.com) (carte), [Chart.js](https://www.chartjs.org) (graphiques) — hébergé sur Netlify
- **Backend** : Cloudflare Workers (API REST), Cloudflare D1 (SQLite), Cloudflare KV (cache)

## Structure du projet

```
world-wild-life/
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js          # orchestration UI (état, événements)
│       ├── api-client.js    # appels à l'API
│       ├── map.js           # carte Leaflet + frontières GeoJSON
│       ├── charts.js        # graphiques Chart.js
│       └── search.js        # utilitaire debounce
│
├── backend/
│   ├── wrangler.toml
│   ├── .dev.vars             # secrets locaux (gitignoré) — IUCN_API_TOKEN
│   ├── src/
│   │   ├── index.js         # routeur principal + handler cron
│   │   └── routes/
│   │       ├── species.js   # liste + détail + pagination/filtres
│   │       ├── regions.js   # régions + espèces par région
│   │       ├── search.js    # recherche full-text
│   │       ├── filters.js   # valeurs distinctes (dropdowns)
│   │       ├── stats.js     # statistiques globales
│   │       ├── iucn.js      # proxy live + synchro batch IUCN Red List
│   │       ├── taxonomy.js  # proxy live + synchro batch NCBI Taxonomy
│   │       ├── wikidata.js  # proxy live Wikidata (image, statut IUCN croisé)
│   │       ├── eol.js       # proxy live Encyclopedia of Life (lien de fiche)
│   │       └── pexels.js    # proxy live Pexels (galerie photo alternative)
│   ├── middleware/cors.js
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.sql         # 250 espèces réelles
│   └── test/                # Vitest (vitest-pool-workers)
│       ├── fixtures.sql
│       ├── seed.js
│       └── routes/*.test.js
│
└── README.md
```

## Démarrage local

### Backend

```bash
cd backend
npx wrangler dev
```

Charger le schéma et les données (base D1 locale) :

```bash
npx wrangler d1 execute world-wild-life-db --local --file=db/schema.sql
npx wrangler d1 execute world-wild-life-db --local --file=db/seed.sql
```

Pour tester les routes IUCN et Pexels en local, créer `backend/.dev.vars` :

```
IUCN_API_TOKEN=<votre-token>
PEXELS_API_KEY=<votre-clé>
```

(inscription gratuite sur [api.iucnredlist.org](https://api.iucnredlist.org/users/sign_up) et [pexels.com/api](https://www.pexels.com/api/)). Les routes NCBI Taxonomy, Wikidata et EOL n'ont besoin d'aucune clé.

### Frontend

```bash
cd frontend
python3 -m http.server 8000
```

Ouvrir `http://localhost:8000`. Le frontend pointe par défaut vers l'API de production (`js/api-client.js`) — modifier `API_BASE_URL` pour tester contre le backend local.

## Déploiement

**Backend (Cloudflare Workers + D1) :**

```bash
cd backend
npx wrangler deploy
npx wrangler d1 execute world-wild-life-db --remote --file=db/schema.sql
npx wrangler d1 execute world-wild-life-db --remote --file=db/seed.sql
npx wrangler secret put IUCN_API_TOKEN
npx wrangler secret put PEXELS_API_KEY
```

**Frontend (Netlify) :**

```bash
netlify deploy --prod --dir=frontend
```

## Tests

```bash
cd backend
npm install
npm test
```

Tests unitaires et d'intégration (Vitest + [`@cloudflare/vitest-pool-workers`](https://developers.cloudflare.com/workers/testing/vitest-integration/)) : les routes s'exécutent dans le vrai runtime Workers avec un D1/KV simulés localement (aucun accès aux ressources de prod). Le schéma + un jeu de données de test sont rechargés avant chaque test via [`test/seed.js`](backend/test/seed.js). Exécutés automatiquement sur push/PR via [GitHub Actions](.github/workflows/backend-tests.yml).

## API

| Endpoint | Description |
|---|---|
| `GET /species` | Liste paginée. Query : `page`, `limit`, `habitat`, `diet`, `status`, `region_id` |
| `GET /species/:id` | Détail d'une espèce + régions associées |
| `GET /species/:id/iucn` | Statut de conservation en direct depuis l'API IUCN Red List (caché 24h en KV) |
| `GET /species/:id/taxonomy` | Taxonomie (kingdom/phylum/class) en direct depuis NCBI Taxonomy (cachée 30j en KV) |
| `GET /species/:id/wikidata` | Fiche Wikidata en direct : image, lien, statut IUCN croisé (cachée 30j en KV) |
| `GET /species/:id/eol` | Lien vers la fiche Encyclopedia of Life (cachée 30j en KV) |
| `GET /species/:id/photos` | Galerie photo alternative depuis Pexels (cachée 7j en KV, nécessite `PEXELS_API_KEY`) |
| `GET /search?q=` | Recherche full-text (nom commun, scientifique, habitat, description) |
| `GET /regions` | Liste des régions (caché en KV, TTL 1h) |
| `GET /regions/:id/species` | Espèces d'une région, paginé |
| `GET /filters` | Valeurs distinctes habitat/diet/status pour les filtres UI (caché en KV, TTL 1h) |
| `GET /stats` | Statistiques globales (total, par statut, par habitat, par régime) (caché en KV, TTL 15min) |

## Base de données

250 espèces réelles réparties sur :
- **7 habitats** : Savane, Forêt tropicale, Océan, Forêt tempérée, Désert, Montagne, Toundra
- **5 classes taxonomiques** : Mammalia (100), Aves (80), Reptilia (30), Amphibia (20), Pisces (20)
- **8 régions** géographiques avec coordonnées

Voir [backend/db/seed.sql](backend/db/seed.sql) pour le détail.

## Sources de données & ressources — état d'avancement

`ARCHITECTURE.md` (section 9) liste des intégrations externes prévues pour de futures itérations. État actuel :

| Ressource | Statut | Détail |
|---|---|---|
| OpenStreetMap (tuiles) | ✅ Intégré | Fond de carte Leaflet en Phase 3 |
| GeoJSON (frontières régions) | ✅ Intégré | Frontières de pays réelles (Natural Earth, domaine public, via click_that_hood) affichées au clic sur 6/8 régions — chargées à la demande |
| Wikimedia Commons (images) | ✅ Intégré | 250/250 espèces ont une vraie photo, récupérée via l'API Wikipedia par nom scientifique, vérifiée sans doublon |
| IUCN Red List API | ✅ Intégré | Synchronisation batch des 250 statuts (14 corrections réelles appliquées) + route live `GET /species/:id/iucn` (proxy sécurisé, token en secret Cloudflare) + rafraîchissement automatique hebdomadaire (Cron Trigger) |
| NCBI Taxonomy | ✅ Intégré | Route live `GET /species/:id/taxonomy` (cachée 30j en KV) + rafraîchissement automatique hebdomadaire (Cron Trigger) qui vérifie/corrige kingdom, phylum et class pour les 250 espèces |
| WikiData API | ✅ Intégré | Route live `GET /species/:id/wikidata` (cachée 30j en KV) : image Commons, lien Wikidata, statut IUCN croisé (P141) — complémentaire à NCBI/IUCN, pas un doublon |
| Pexels | ✅ Intégré | Route live `GET /species/:id/photos` (cachée 7j en KV) : galerie alternative de 5 photos, en plus des photos Wikimedia déjà en base — nécessite `PEXELS_API_KEY` (secret Cloudflare) |
| Encyclopedia of Life | ⚠️ Partiellement intégré | Route live `GET /species/:id/eol` (cachée 30j en KV) limitée à un lien direct vers la fiche — l'API classique de contenu (descriptions, images, IUCN) est dépréciée côté EOL et ne renvoie plus que des métadonnées vides |

### Notes sur l'intégration IUCN

- Un compte gratuit sur [api.iucnredlist.org](https://api.iucnredlist.org/users/sign_up) est nécessaire pour obtenir un token.
- Certaines espèces n'ont pas d'évaluation IUCN pour des raisons légitimes : espèces domestiquées non évaluées globalement (ex. dromadaire), ou synonymes taxonomiques non reconnus par l'API (ex. *Taurotragus oryx* vs *Tragelaphus oryx*).
- Un même taxon peut avoir plusieurs évaluations "latest" simultanées à des échelles différentes (ex. Europe vs Global) — le code filtre explicitement sur le scope global (code `"1"`) pour éviter d'appliquer un statut régional par erreur.
- Le statut `DD` (Data Deficient) est un statut UICN légitime, désormais supporté par l'UI (ex. l'orque *Orcinus orca* n'est pas évaluée mondialement en raison d'incertitudes taxonomiques sur ses écotypes).
- **Rafraîchissement automatique** : un Cron Trigger Cloudflare Workers (`0 3 * * SUN`, chaque dimanche 3h UTC) exécute [`syncAllIucnStatuses`](backend/src/routes/iucn.js) qui reparcourt les 250 espèces par lots de 10 requêtes parallèles, met à jour `SPECIES.conservation_status` en cas de changement et rafraîchit le cache KV. Actif uniquement une fois déployé (`wrangler deploy`) — les crons ne se déclenchent pas en local avec `wrangler dev`. Test manuel possible via `npx wrangler dev --test-scheduled` puis `curl "http://localhost:8787/__scheduled?cron=0+3+*+*+SUN"`.

### Notes sur l'intégration NCBI Taxonomy

- Utilise l'API publique [eutils](https://www.ncbi.nlm.nih.gov/books/NBK25501/) (`esearch` puis `efetch` sur la base `taxonomy`), sans clé requise — limitée à 3 requêtes/seconde, respectée par un délai de 400ms entre espèces pendant la synchro batch.
- NCBI utilise `Metazoa` comme rang `kingdom` pour les animaux ; le code le normalise en `Animalia` pour rester cohérent avec le reste du jeu de données.
- **Rafraîchissement automatique** : un second Cron Trigger (`0 4 * * SUN`, chaque dimanche 4h UTC — décalé d'1h par rapport à la synchro IUCN) exécute [`syncAllTaxonomies`](backend/src/routes/taxonomy.js) qui vérifie/corrige `kingdom`, `phylum` et `class` pour les 250 espèces et rafraîchit le cache KV (TTL 30 jours, la taxonomie changeant très rarement).

### Notes sur l'intégration WikiData

- Utilise l'API publique `action=wbsearchentities` (recherche par nom scientifique) puis `action=wbgetentities` (claims + labels), sans clé requise.
- Wikimedia impose depuis peu un header `User-Agent` descriptif sur ses APIs — son absence fait échouer les requêtes silencieusement (réponse en texte brut au lieu du JSON attendu). Le code envoie un User-Agent dédié sur chaque appel.
- Sert de complément à IUCN/NCBI plutôt qu'un doublon : image libre de droits (Commons, propriété P18) et statut de conservation IUCN croisé (propriété P141, avec un second appel pour résoudre le libellé) — utile pour repérer d'éventuels écarts entre sources.

### Notes sur l'intégration Encyclopedia of Life

- L'API classique `eol.org/api/pages` (descriptions, images, statut IUCN par fiche) est dépréciée côté EOL : elle répond toujours HTTP 200 mais ne renvoie plus aucun `dataObjects` exploitable.
- L'intégration se limite donc à `eol.org/api/search`, qui reste fonctionnelle, pour retrouver l'identifiant de fiche et exposer un lien direct (`eol_page_url`).

### Notes sur l'intégration Pexels

- Nécessite une clé API gratuite ([pexels.com/api](https://www.pexels.com/api/)), à définir en secret Cloudflare (`PEXELS_API_KEY`) — la route renvoie `503` si elle est absente, comme pour IUCN.
- Sert de galerie alternative (5 photos par espèce, recherche sur le nom commun) : les 250 espèces ont déjà une photo Wikimedia vérifiée en base, qui reste la source principale.

## Roadmap restante

Tous les chantiers identifiés ont été traités. Idées pour de futures itérations : tests end-to-end frontend, alerting sur échec de synchro cron.
