# ═══════════════════════════════════════════════════════════
# LECTIO DIVINA — DÉPLOIEMENT CLOUDFLARE
# ═══════════════════════════════════════════════════════════

## 📋 PRÉREQUIS

1. Compte Cloudflare (gratuit)
2. Clé API Mistral (https://console.mistral.ai)
3. Node.js installé (pour Wrangler)

---

## 🚀 ÉTAPES DE DÉPLOIEMENT

### 1. Installer Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Se connecter à Cloudflare

```bash
wrangler login
```

### 3. Initialiser le projet Worker

```bash
wrangler init lectio-divina-worker
cd lectio-divina-worker
```

### 4. Configurer wrangler.toml

Remplacez le contenu de `wrangler.toml` par :

```toml
name = "lectio-divina-api"
main = "worker.js"
compatibility_date = "2024-01-01"

# Variables d'environnement (NE PAS COMMITER LA CLÉ !)
[vars]
ALLOWED_ORIGIN = "*"  # En production, remplacez par votre domaine

# Pour le développement local
[dev]
port = 8787

# Secrets (à configurer avec la commande wrangler secret)
# MISTRAL_API_KEY sera ajouté via: wrangler secret put MISTRAL_API_KEY
```

### 5. Copier le fichier worker.js

Copiez le fichier `worker.js` dans le dossier du projet.

### 6. Ajouter la clé API Mistral (SÉCURISÉ)

```bash
wrangler secret put MISTRAL_API_KEY
```

Entrez votre clé API Mistral quand demandé. Elle sera chiffrée et stockée de manière sécurisée.

### 7. Déployer le Worker

```bash
wrangler deploy
```

Vous recevrez une URL comme : `https://lectio-divina-api.votre-subdomain.workers.dev`

---

## 🔧 CONFIGURATION DU FRONTEND

Dans `index.html`, modifiez la configuration :

```javascript
const CONFIG = {
  // Remplacez par l'URL de votre Worker déployé
  API_PROXY_URL: 'https://lectio-divina-api.votre-subdomain.workers.dev/api/mistral',
  
  MODEL: 'mistral-large-latest',
  LOCAL_API_KEY: '',  // ← LAISSER VIDE EN PRODUCTION
  USE_FALLBACK: false,
};
```

---

## 📁 STRUCTURE DES FICHIERS

```
lectio-divina/
├── index.html              # Frontend (peut être hébergé sur Cloudflare Pages)
├── worker.js               # Cloudflare Worker (proxy API sécurisé)
├── wrangler.toml           # Configuration Wrangler
├── .dev.vars              # Variables locales (NE PAS COMMITER)
├── .gitignore             # Pour exclure les fichiers sensibles
└── README_DEPLOYMENT.md   # Ce fichier
```

---

## 🔒 SÉCURITÉ

### Ce qui est protégé :
✅ La clé API Mistral n'est **jamais** exposée côté client
✅ Les appels API passent par le proxy Cloudflare Worker
✅ La clé est stockée dans les secrets chiffrés de Cloudflare
✅ CORS configuré pour restreindre l'accès

### Bonnes pratiques :
- Ne jamais commiter `.dev.vars` ou fichiers contenant des clés
- Utiliser `wrangler secret` pour toutes les clés API
- En production, configurez `ALLOWED_ORIGIN` avec votre domaine exact
- Activez Cloudflare Analytics pour surveiller l'utilisation

---

## 🧪 TEST LOCAL

### 1. Créer un fichier `.dev.vars`

```
MISTRAL_API_KEY=votre_clé_mistral_locale
ALLOWED_ORIGIN=*
```

⚠️ **N'oubliez pas d'ajouter `.dev.vars` au `.gitignore` !**

### 2. Démarrer le Worker en local

```bash
wrangler dev
```

Le Worker sera disponible sur `http://localhost:8787`

### 3. Tester l'API

```bash
curl -X POST http://localhost:8787/api/mistral \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Bonjour"}],
    "model": "mistral-large-latest"
  }'
```

---

## 🌐 HÉBERGER LE FRONTEND SUR CLOUDFLARE PAGES

### Option 1 : Pages avec intégration Worker

1. Allez sur https://pages.cloudflare.com
2. Créez un nouveau projet
3. Connectez votre dépôt Git
4. Dans "Functions", liez votre Worker existant
5. Déployez

### Option 2 : Pages statiques uniquement

1. Déployez `index.html` sur Cloudflare Pages
2. Dans les paramètres de Pages, ajoutez une règle de réécriture :
   - Route : `/api/*`
   - Destination : `https://votre-worker.workers.dev/api/*`

---

## 📊 SURVEILLANCE

### Dashboard Cloudflare
- https://dash.cloudflare.com → Workers & Pages
- Voir les logs, erreurs, et utilisation

### Commandes utiles

```bash
# Voir les logs en temps réel
wrangler tail

# Annuler un déploiement
wrangler rollback

# Voir les versions déployées
wrangler versions list
```

---

## 💰 COÛTS ESTIMATIFS

### Cloudflare Worker (plan gratuit)
- 100 000 requêtes/jour gratuites
- Suffisant pour ~3000 utilisateurs quotidiens

### Mistral AI
- mistral-large-latest : ~€0.15 / 1M tokens input
- Coût moyen par session : ~€0.002

**Exemple pour 100 sessions/jour :** ~€0.20/jour = ~€6/mois

---

## 🆘 DÉPANNAGE

### Erreur "API key not configured"
→ Exécutez `wrangler secret put MISTRAL_API_KEY`

### Erreur CORS
→ Vérifiez `ALLOWED_ORIGIN` dans wrangler.toml

### Erreur 404 sur /api/mistral
→ Vérifiez que le chemin dans worker.js correspond

### Rate limiting
→ Par défaut, Cloudflare limite à 1000 req/5min
→ Augmentez dans le dashboard si nécessaire

---

## 📞 SUPPORT

- Documentation Cloudflare : https://developers.cloudflare.com/workers/
- Documentation Mistral : https://docs.mistral.ai/
- Issues GitHub : [votre-dépôt]/issues

---

**⚠️ RAPPEL IMPORTANT :** Ne jamais commiter de clés API dans Git. Utilisez toujours `wrangler secret` ou des variables d'environnement sécurisées.
