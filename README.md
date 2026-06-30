# PrizeFlow Frontend (V1)

Application web de pilotage de la roue ALPHA et de gestion de campagnes
promotionnelles. Pensée pour une tablette en mode paysage (iPad, Android
10-13").

## Stack

React + Vite, React Router, CSS pur (design tokens dans `src/index.css`).
Communique avec `prizeflow-backend` en HTTP (REST) et WebSocket (statut
temps réel de la roue).

## Configuration

```bash
npm install
cp .env.example .env   # renseigner VITE_API_BASE_URL avec l'URL du backend déployé
npm run dev             # développement local, http://localhost:5173
npm run build            # build de production dans dist/
```

## Pages

- `/login` — authentification opérateur
- `/` — Dashboard (KPI, campagne active, activité récente)
- `/campaigns` — liste des campagnes
- `/campaigns/new` — création (12 cases, cadeau + stock par case)
- `/campaigns/:id` — détail, répartition, actions start/pause/end
- `/launch` — écran principal opérateur : Room Number + Start Spin,
  affichage plein écran du résultat, formulaire client RGPD
- `/calibration` — reprend les actions existantes (Cal, CalIndex0, CalIndex1,
  test de chaque case) en passthrough direct vers la roue
- `/history` — historique des distributions et des rewards (CRM)

## Déploiement

Build statique standard, déployable sur Vercel ou Netlify (voir la notice de
déploiement globale du projet pour les étapes détaillées).
