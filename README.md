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
│       ├── map.js           # carte Leaflet + frontières GeoJSON
│       ├── charts.js        # graphiques Chart.js
│       └── search.js        # utilitaire debounce
│
├── backend/
│   ├── wrangler.toml
│   ├── .dev.vars             # secrets locaux (gitignoré) — IUCN_API_TOKEN
│   ├── src/
│   │   ├── index.js         # routeur principal
│   │   └── routes/
│   │       ├── species.js   # liste + détail + pagination/filtres
│   │       ├── regions.js   # régions + espèces par région
│   │       ├── search.js    # recherche full-text
│   │       ├── filters.js   # valeurs distinctes (dropdowns)
│   │       ├── stats.js     # statistiques globales
│   │       └── iucn.js      # proxy live vers l'API IUCN Red List
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

Pour tester la route IUCN en local, créer `backend/.dev.vars` :

```
IUCN_API_TOKEN=<votre-token>
```

(inscription gratuite sur [api.iucnredlist.org](https://api.iucnredlist.org/users/sign_up))

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
| `GET /species/:id/iucn` | Statut de conservation en direct depuis l'API IUCN Red List (caché 24h en KV) |
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
| IUCN Red List API | ✅ Intégré | Synchronisation batch des 250 statuts (14 corrections réelles appliquées) + route live `GET /species/:id/iucn` (proxy sécurisé, token en secret Cloudflare) |
| WikiData API | ⏳ Non intégré | — |
| Pexels | ⏳ Non intégré | Superflu, couvert par Wikimedia |
| NCBI Taxonomy | ⏳ Non intégré | Champs kingdom/phylum/class saisis manuellement |
| Encyclopedia of Life | ⏳ Non intégré | — |

### Notes sur l'intégration IUCN

- Un compte gratuit sur [api.iucnredlist.org](https://api.iucnredlist.org/users/sign_up) est nécessaire pour obtenir un token.
- Certaines espèces n'ont pas d'évaluation IUCN pour des raisons légitimes : espèces domestiquées non évaluées globalement (ex. dromadaire), ou synonymes taxonomiques non reconnus par l'API (ex. *Taurotragus oryx* vs *Tragelaphus oryx*).
- Un même taxon peut avoir plusieurs évaluations "latest" simultanées à des échelles différentes (ex. Europe vs Global) — le code filtre explicitement sur le scope global (code `"1"`) pour éviter d'appliquer un statut régional par erreur.
- Le statut `DD` (Data Deficient) est un statut UICN légitime, désormais supporté par l'UI (ex. l'orque *Orcinus orca* n'est pas évaluée mondialement en raison d'incertitudes taxonomiques sur ses écotypes).

## Roadmap restante

- [ ] Tests unitaires et d'intégration
- [ ] Intégration WikiData / NCBI Taxonomy pour enrichir la taxonomie
- [ ] Rafraîchissement automatique périodique des statuts IUCN (actuellement synchronisation manuelle + route live à la demande)
