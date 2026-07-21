# WORLD WILD LIFE - Wildlife Tracker

**Document d'architecture technique pour Claude Code**

---

## 1. VUE D'ENSEMBLE

World Wild Life est une application web interactive permettant de consulter, filtrer et explorer les espèces animales du monde, leurs habitats, leurs statuts de conservation, et leurs zones géographiques. L'application offre une base de données complète avec cartes interactives et recherche avancée.

### Objectifs principaux

- Centraliser les données sur la faune sauvage mondiale
- Fournir des fiches détaillées par espèce (habitat, alimentation, reproduction, conservation)
- Permettre une recherche/filtrage avancés (habitat, région, statut UICN, régime alimentaire)
- Afficher les zones géographiques via cartes interactives
- Tracker le statut de conservation et les menaces

---

## 2. STACK TECHNOLOGIQUE

### Frontend
- **HTML5 / CSS3 / JavaScript ES6+**
- **Leaflet.js** - Cartes interactives géographiques
- **Chart.js** - Graphiques et statistiques de conservation
- **Fetch API** - Communication avec le backend

### Backend
- **Cloudflare Workers** - APIs serverless
- **Wrangler** - CLI et déploiement
- **Cloudflare KV** - Cache et données volatiles
- **SQLite / PostgreSQL (via Cloudflare D1)** - Base de données persistante

### Hosting & Déploiement
- **Netlify** - Hébergement du frontend
- **Cloudflare Workers** - APIs backend
- **GitHub** - Versioning et CI/CD

---

## 3. ARCHITECTURE GÉNÉRALE

### Diagramme flux

```
User 
  ↓
Netlify (Frontend HTML/CSS/JS)
  ↓
Cloudflare Workers (APIs REST)
  ↓
├── Cloudflare D1 (SQLite/PostgreSQL)
├── Cloudflare KV (Cache)
└── Leaflet.js API (Cartes)
```

### Points clés

- **Stateless APIs** - Chaque requête est indépendante
- **Caching KV** - Réduire les requêtes DB pour les données statiques
- **CORS activé** - Autorise les requêtes cross-origin de Netlify
- **Pagination** - Limiter les résultats pour performance

---

## 4. STRUCTURE DU PROJET

```
world-wild-life/
│
├── frontend/  (Netlify)
│   ├── index.html
│   ├── css/
│   │   ├── style.css
│   │   └── leaflet-custom.css
│   ├── js/
│   │   ├── main.js
│   │   ├── api-client.js
│   │   ├── map.js
│   │   ├── search.js
│   │   └── utils.js
│   ├── img/ (logos, icônes)
│   └── data/ (statiques)
│
├── backend/ (Cloudflare Workers)
│   ├── wrangler.toml
│   ├── src/
│   │   ├── index.js (router principal)
│   │   ├── routes/
│   │   │   ├── species.js
│   │   │   ├── habitats.js
│   │   │   ├── regions.js
│   │   │   └── search.js
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── middleware/
│       ├── cors.js
│       └── auth.js (si nécessaire)
│
├── .github/workflows/ (CI/CD)
│   └── deploy.yml
│
└── README.md
```

---

## 5. MODÈLE DE DONNÉES (Cloudflare D1 / SQLite)

### Table : SPECIES

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER PRIMARY KEY | Identifiant unique |
| name_common | TEXT NOT NULL | Nom commun (ex: Lion) |
| name_scientific | TEXT UNIQUE | Nom scientifique (Panthera leo) |
| kingdom | TEXT | Animalia, etc. |
| phylum | TEXT | Chordata, Arthropoda, etc. |
| class | TEXT | Mammalia, Aves, etc. |
| habitat | TEXT | Savane, Forêt tropicale, Océan |
| diet | TEXT | Carnivore, Herbivore, Omnivore |
| conservation_status | TEXT | EN, VU, NT, LC (UICN) |
| population_trend | TEXT | Increasing, Stable, Decreasing |
| description | TEXT LONG | Description détaillée de l'espèce |
| image_url | TEXT | URL de l'image |
| created_at | TIMESTAMP | Date de création |

### Table : REGIONS

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER PRIMARY KEY | Identifiant unique |
| name | TEXT NOT NULL | Afrique, Asie, Océanie, etc. |
| latitude | FLOAT | Coordonnée géographique |
| longitude | FLOAT | Coordonnée géographique |
| description | TEXT | Description de la région |

### Table : SPECIES_REGIONS (association M:N)

| Colonne | Type | Description |
|---------|------|-------------|
| species_id | INTEGER FOREIGN KEY | Référence à SPECIES |
| region_id | INTEGER FOREIGN KEY | Référence à REGIONS |
| presence | TEXT | Resident, Migratory, Vagrant |

---

## 6. APIS CLOUDFLARE WORKERS

**Base URL :** `https://api.world-wild-life.workers.dev`

### GET /species - Lister toutes les espèces

**Paramètres query optionnels :**
- `page` (int) - Numéro de page (défaut: 1)
- `limit` (int) - Éléments par page (défaut: 20, max: 100)
- `habitat` (string) - Filtre par habitat
- `diet` (string) - Filtre par régime
- `status` (string) - Filtre par statut conservation
- `region_id` (int) - Filtre par région

**Réponse :**
```json
{
  "species": [...],
  "total": 1250,
  "page": 1,
  "pages": 63
}
```

---

### GET /species/:id - Détails d'une espèce

**Paramètres :**
- `id` (int) - Identifiant de l'espèce

**Réponse :**
```json
{
  "id": 1,
  "name_common": "Lion",
  "name_scientific": "Panthera leo",
  "habitat": "Savane",
  "diet": "Carnivore",
  "conservation_status": "VU",
  "description": "...",
  "image_url": "...",
  "regions": [
    { "id": 1, "name": "Afrique", "presence": "Resident" }
  ]
}
```

---

### GET /search - Recherche full-text

**Paramètres query obligatoires :**
- `q` (string) - Terme de recherche (min 2 caractères, obligatoire)
- `limit` (int) - Nombre de résultats (défaut: 10)

**Recherche sur :** name_common, name_scientific, habitat, description

**Réponse :**
```json
{
  "results": [
    { "id": 1, "name_common": "Lion", "name_scientific": "Panthera leo" }
  ],
  "count": 5
}
```

---

### GET /regions - Lister les régions

**Réponse :**
```json
{
  "regions": [
    {
      "id": 1,
      "name": "Afrique",
      "latitude": -6.369,
      "longitude": 34.888,
      "description": "..."
    }
  ]
}
```

---

### GET /regions/:id/species - Espèces dans une région

**Paramètres :**
- `id` (int) - Identifiant de la région
- `page` (int) - Pagination (défaut: 1)
- `limit` (int) - Éléments par page (défaut: 20)

**Réponse :**
```json
{
  "region": "Afrique",
  "species": [...],
  "total": 342,
  "page": 1
}
```

---

### GET /stats - Statistiques globales

**Réponse :**
```json
{
  "total_species": 1250,
  "by_status": {
    "EN": 120,
    "VU": 250,
    "NT": 180,
    "LC": 700
  },
  "by_habitat": {
    "Savane": 150,
    "Forêt tropicale": 280,
    "Océan": 200
  },
  "by_diet": {
    "Carnivore": 200,
    "Herbivore": 500,
    "Omnivore": 550
  }
}
```

---

## 7. PHASES DE DÉVELOPPEMENT

### PHASE 1 : Fondations (2-3 semaines)

**Objectif :** Setup complet + APIs basiques + frontend minimaliste

- ✅ Setup GitHub repository (world-wild-life)
- ✅ Initialiser Netlify project
- ✅ Initialiser Cloudflare Workers (wrangler)
- ✅ Créer schéma DB (SPECIES, REGIONS, SPECIES_REGIONS)
- ✅ Mettre en seed la base (50-100 espèces)
- ✅ Développer APIs basiques : GET /species, GET /species/:id
- ✅ Frontend basique : list + détails
- ✅ Déployer sur Netlify + Workers
- ✅ Tester cross-origin (CORS)

**Livrables :**
- Repository GitHub avec CI/CD
- 2 endpoints opérationnels
- Liste des espèces fonctionnelle sur frontend
- Page de détails d'une espèce

---

### PHASE 2 : Recherche & Filtrage (2-3 semaines)

**Objectif :** Fonctionnalités avancées + perf optimisée

- ✅ API GET /search (full-text search)
- ✅ API filtrage avancé : habitat, diet, status
- ✅ UI de filtres interactifs (formulaire)
- ✅ Pagination sur listage
- ✅ Caching KV pour régions + habitats statiques
- ✅ Ajouter ~200 espèces supplémentaires
- ✅ Optimiser requêtes DB (indexes)
- ✅ Tests de charge

**Livrables :**
- Barre de recherche fonctionnelle
- Panneaux de filtres (habitat, régime, statut)
- Pagination paginator
- Performance <200ms par requête

---

### PHASE 3 : Cartes & Visualisations (2-3 semaines)

**Objectif :** Expérience utilisateur complète avec cartes et data viz

- ✅ Intégrer Leaflet.js
- ✅ Afficher régions sur carte interactive
- ✅ Zoomer sur région → afficher espèces locales
- ✅ Marqueurs pour chaque région
- ✅ Graphiques conservation status (Chart.js)
- ✅ Statistiques globales (GET /stats)
- ✅ Dashboard avec KPIs
- ✅ Polish UI/UX (design cohérent)
- ✅ Tests complets (unitaires + intégration)
- ✅ Documentation README

**Livrables :**
- Carte interactive Leaflet
- Graphiques Chart.js
- Dashboard statistiques
- README complet + deployment docs

---

## 8. POINTS CLÉS DE DÉVELOPPEMENT

### Performance

- **Pagination obligatoire** - Ne jamais retourner >100 espèces d'un coup
- **Caching KV** - Stocker listes régions, habitats, diets (données statiques)
- **Indexes DB** - Sur habitat, diet, conservation_status, name_common
- **Lazy loading images** - Sur frontend (Intersection Observer)
- **Compression** - Gzip responses

### Qualité des données

- **Valider conservation_status** - Contre énumération UICN officielle (EN, VU, NT, LC, DD, NE, EX)
- **Vérifier coordonnées GPS** - Latitude [-90,90], Longitude [-180,180]
- **Images** - Dimensions min 800x600, format JPG/WebP optimisé
- **Noms scientifiques** - Unique, format binominal (Genre espèce)
- **Descriptions** - Min 100 caractères, sources citées

### Sécurité

- **CORS configuré** - Autoriser uniquement Netlify origin
- **Valider inputs** - Limiter length query params, échapper spéciaux chars
- **Rate limiting (futur)** - 100 req/min par IP
- **HTTPS obligatoire** - Cloudflare le force
- **Logs d'erreurs** - Centralisés (pas de stacktraces en response)

### Accessibilité

- **Alt text images** - Tous les animaux décrits
- **Contraste couleurs** - WCAG AA min (ratio 4.5:1 texte/fond)
- **Leaflet.js accessible** - Navigation au clavier
- **Sémantique HTML** - Headings, labels, ARIA si besoin
- **Responsive mobile** - Tests sur iPhone 12 mini (375px)

---

## 9. SOURCES DE DONNÉES & RESSOURCES

### APIs externes à intégrer (futur)

- **IUCN Red List API** - Conservation status officiels
- **WikiData API** - Données taxonomiques complètes
- **OpenStreetMap / GeoJSON** - Frontières + polygones régions

### Images

- **Unsplash** - Libre de droits, haute qualité
- **Pexels** - Libre de droits
- **Wikimedia Commons** - CC-BY (vérifier licences)

### Taxonomie

- **NCBI Taxonomy** - Classification scientifique officielle
- **Encyclopedia of Life** - Fiches espèces complètes

---

## 10. COMMANDES DE DÉMARRAGE CLAUDE CODE

### Frontend (Netlify)

```bash
cd frontend
python -m http.server 8000
# Puis ouvrir http://localhost:8000
```

### Backend (Cloudflare Workers)

```bash
cd backend
npm install -g wrangler
wrangler dev
# Puis appeler http://localhost:8787/species
```

### Tester les APIs localement

```bash
curl http://localhost:8787/species
curl http://localhost:8787/species/1
curl "http://localhost:8787/search?q=lion"
curl http://localhost:8787/regions
```

### Deployment Netlify

```bash
git push origin main
# Auto-déploie via GitHub Actions
# Vérifier : https://app.netlify.com
```

### Deployment Cloudflare Workers

```bash
cd backend
wrangler publish
# Déploie sur https://api.world-wild-life.workers.dev
```

### Logs

```bash
wrangler tail  # Voir logs de Workers en temps réel
```

---

## 11. CHECKLIST PRE-PRODUCTION

### Avant Phase 1

- [ ] GitHub repo créé + collaborateurs ajoutés
- [ ] Netlify projet connecté au repo
- [ ] Cloudflare account setup (D1, KV, Workers)
- [ ] `.env.example` vs `.env` sécurisé (secrets Netlify/Workers)
- [ ] README initial rédigé

### Avant Phase 2

- [ ] 50 espèces seed en BD (avec images)
- [ ] Tests manuels toutes les APIs
- [ ] CORS testé depuis frontend local
- [ ] Performance baseline (LightHouse >80)

### Avant Phase 3

- [ ] 250+ espèces en BD
- [ ] Leaflet.js intégré + POC carte
- [ ] Chart.js graphique statut conservation
- [ ] Tous endpoints testés (curl + Postman)
- [ ] Mobile responsive test

### Avant déploiement

- [ ] Documentation README complète
- [ ] Deployment guide pour nouveau dev
- [ ] CORS finalisé (domaines prod)
- [ ] Health check API (/stats toujours disponible)
- [ ] Error handling robuste (500, 404, 400 bien répondus)

---

## 12. NOTES FINALES

### Philosophie de développement

- **Itératif** - Phase par phase, jamais tout d'un coup
- **Testable** - Chaque API endpoint testé avant UI
- **Documenté** - Code commenté, architecture à jour
- **Performant** - Pas de N+1 queries, caching d'abord
- **Accessible** - WCAG AA, mobile-first

### Tech stack choisie pour toi

✨ **Frontend :** HTML/CSS/JS vanilla + Leaflet + Chart.js (pas de framework lourd)
✨ **Backend :** Cloudflare Workers serverless + D1 SQLite (scalable, gratuit)
✨ **Hosting :** Netlify + Cloudflare (edge-first, perfs optimales)

Cette stack te permet de déployer rapidement, itérer sans bottleneck infra, et apprendre à fond chaque couche.

---

### Recommandations temporelles

| Phase | Durée | Commits | Niveau difficulté |
|-------|-------|---------|-------------------|
| Phase 1 | 2-3 sem | 15-20 | Moyen |
| Phase 2 | 2-3 sem | 12-15 | Moyen-Haut |
| Phase 3 | 2-3 sem | 10-12 | Haut |
| **Total** | **6-9 sem** | **37-47** | **Progressif** |

### Points d'apprentissage clés

1. **Cloudflare Workers + D1** - Serverless à la française 🇫🇷
2. **Cartes interactives** - Leaflet.js deep dive
3. **Data visualization** - Chart.js pro
4. **Database design** - Normalized schemas + indexes
5. **Frontend performance** - Lazy loading, caching stratégies

---

✨ **Bonne chance avec World Wild Life ! 🌍🦁🦜**

*Document créé pour Claude Code - juillet 2026*
*Importable directement dans Notion + versioning GitHub*
