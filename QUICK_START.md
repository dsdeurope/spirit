# ✦ Lectio Divina — Guide de Démarrage Rapide

## 🎯 Objectif

Faire fonctionner l'application en **5 minutes** pour tester localement.

---

## ⚡ Étapes rapides

### 1️⃣ Installer Wrangler (une seule fois)

```bash
npm install -g wrangler
```

### 2️⃣ Obtenir une clé API Mistral

1. Allez sur https://console.mistral.ai
2. Créez un compte gratuit (ou connectez-vous)
3. Allez dans **"API Keys"** dans le menu
4. Cliquez sur **"Create new key"**
5. Copiez la clé générée (elle commence par `e...`)

### 3️⃣ Configurer la clé

```bash
cp .dev.vars.example .dev.vars
```

Puis éditez le fichier `.dev.vars` :

```bash
nano .dev.vars
# ou utilisez votre éditeur préféré : code .dev.vars, vim .dev.vars, etc.
```

Remplacez cette ligne :
```
MISTRAL_API_KEY=votre_clé_mistral_ici
```

Par votre vraie clé :
```
MISTRAL_API_KEY=e7votre_vraie_clé_mistral_ici
```

Sauvegardez et fermez.

### 4️⃣ Lancer l'application

```bash
wrangler dev
```

### 5️⃣ Ouvrir dans le navigateur

Allez sur : **http://localhost:8787**

---

## ✅ Ça marche ?

Vous devriez voir l'interface de Lectio Divina avec :
- Le compteur de streak
- Les 3 modes de lecture (2min, 5min, 10min)
- Un verset biblique du jour

Cliquez sur un mode pour commencer une session !

---

## 🐛 Problèmes fréquents

### "API key not configured"
→ Vérifiez que `.dev.vars` existe et contient votre clé API

### "Command not found: wrangler"
→ Installez wrangler : `npm install -g wrangler`

### Erreur de port 8787 déjà utilisé
→ Changez le port dans `wrangler.toml` ou tuez le processus utilisant ce port

---

## 📝 Prochaines étapes

Une fois que ça fonctionne en local :

1. **Déployer le Worker** → Voir [README_DEPLOYMENT.md](./README_DEPLOYMENT.md)
2. **Héberger le frontend** → Cloudflare Pages, Netlify, ou Vercel
3. **Personnaliser** → Ajoutez vos passages bibliques préférés dans `index.html`

---

## 💡 Astuce

Gardez le terminal ouvert avec `wrangler dev` pendant que vous développez. 
Il rechargera automatiquement les changements dans `worker.js`.

Pour le frontend (`index.html`), ouvrez simplement le fichier dans votre navigateur 
ou servez-le avec un serveur statique.

---

**Besoin d'aide ?** Consultez la documentation complète : [README_DEPLOYMENT.md](./README_DEPLOYMENT.md)
