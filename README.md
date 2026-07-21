# World Wild Life 🌍

Application web interactive pour consulter, filtrer et explorer les espèces animales du monde, leurs habitats, leurs statuts de conservation UICN et leurs zones géographiques.

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
│       ├── map.js           # carte Leaflet
│       ├── charts.js        # graphiques Chart.js
│       └── search.js        # utilitaire debounce
│
├── backend/
│   ├── wrangler.toml
│   ├── src/
│   │   ├── index.js         # routeur principal
│   │   └── routes/
│   │       ├── species.js   # liste + détail + pagination/filtres
│   │       ├── regions.js   # régions + espèces par région
│   │       ├── search.js    # recherche full-text
│   │       ├── filters.js   # valeurs distinctes (dropdowns)
│   │       └── stats.js     # statistiques globales
│   ├── middleware/cors.js
│   └── db/
│       ├── schema.sql
│       └── seed.sql         # 250 espèces réelles
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
```

**Frontend (Netlify) :**

```bash
netlify deploy --prod --dir=frontend
```

## API

| Endpoint | Description |
|---|---|
| `GET /species` | Liste paginée. Query : `page`, `limit`, `habitat`, `diet`, `status`, `region_id` |
| `GET /species/:id` | Détail d'une espèce + régions associées |
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
| IUCN Red List API | ⏳ Non intégré | Statuts UICN saisis manuellement, biologiquement réalistes mais non synchronisés en direct |
| WikiData API | ⏳ Non intégré | — |
| GeoJSON (frontières régions) | ⏳ Non intégré | Régions représentées par un point (lat/lng), pas par un polygone |
| Unsplash (images) | ⚠️ Partiel | URLs `source.unsplash.com/?<mot-clé>` (redirection), pas de photos sélectionnées manuellement ni vérifiées |
| Pexels | ⏳ Non intégré | — |
| Wikimedia Commons | ⏳ Non intégré | — |
| NCBI Taxonomy | ⏳ Non intégré | Champs kingdom/phylum/class saisis manuellement |
| Encyclopedia of Life | ⏳ Non intégré | — |

Ces intégrations ne faisaient pas partie du périmètre des Phases 1 à 3 (voir `ARCHITECTURE.md` section 7) et restent une piste d'évolution.

## Roadmap restante (Phase 3)

- [ ] Tests unitaires et d'intégration
- [ ] Remplacement des URLs d'images placeholder par des images réelles vérifiées
- [ ] Intégration IUCN Red List API pour des statuts de conservation à jour
