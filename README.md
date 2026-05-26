# ✦ Lectio Divina — Lecture biblique quotidienne

Application web de lecture biblique quotidienne avec analyse théologique en 8 dimensions. Modes 2, 5 et 10 minutes.

## 🚀 Démarrage rapide

### 1. Installer les dépendances

```bash
npm install -g wrangler
```

### 2. Configurer la clé API Mistral

Copiez le fichier d'exemple et ajoutez votre clé :

```bash
cp .dev.vars.example .dev.vars
```

Puis éditez `.dev.vars` et remplacez `votre_clé_mistral_ici` par votre vraie clé API Mistral (obtenez-la sur https://console.mistral.ai).

### 3. Lancer en local

```bash
wrangler dev
```

L'application sera disponible sur http://localhost:8787

## 📁 Structure

- `index.html` — Frontend (interface utilisateur)
- `worker.js` — Cloudflare Worker (proxy API sécurisé)
- `wrangler.toml` — Configuration Wrangler
- `.dev.vars` — Variables locales (NE PAS COMMITER)

## 🔒 Sécurité

La clé API Mistral n'est **jamais** exposée côté client. Elle reste sécurisée dans le Cloudflare Worker.

## 📖 Documentation complète

Voir [README_DEPLOYMENT.md](./README_DEPLOYMENT.md) pour les instructions détaillées de déploiement.
