# 🔧 Fix Database Connection Error

## Problème détecté
L'erreur `Failed to load resource: the server responded with a status of 401` indique que :
1. La base de données Neon n'est pas accessible
2. Les migrations n'ont pas été appliquées
3. La table `User` n'existe pas encore

## Solution : Vérifier DATABASE_URL sur Vercel

### Étape 1 : Vérifier la variable DATABASE_URL

1. Va sur : https://vercel.com/drum-designs-projects/mars-merch-app/settings/environment-variables
2. Cherche la variable `DATABASE_URL`
3. **Si elle n'existe pas ou est vide**, il faut la configurer

### Étape 2 : Obtenir l'URL de la base de données Neon

**Option A : Via Vercel Integration (recommandé)**
1. Va sur : https://vercel.com/drum-designs-projects/mars-merch-app/settings/integrations
2. Cherche "Neon" dans les intégrations
3. Si Neon est connecté, la variable `DATABASE_URL` devrait être automatique
4. Si ce n'est pas le cas, reconnecte l'intégration Neon

**Option B : Manuellement depuis Neon**
1. Va sur https://console.neon.tech
2. Sélectionne ton projet
3. Va dans "Connection Details"
4. Copie la "Connection string" (commence par `postgresql://`)
5. Ajoute-la comme variable `DATABASE_URL` sur Vercel (Production)

### Étape 3 : Forcer l'application des migrations

Une fois `DATABASE_URL` configurée, je vais créer une route spéciale pour appliquer les migrations manuellement.

## ⚠️ IMPORTANT

La base de données Neon doit être accessible depuis Vercel. Si tu as créé la base de données récemment, vérifie que :
- Le projet Neon est actif
- L'intégration Vercel ↔ Neon est configurée
- La base de données n'est pas en pause (Neon met en pause les DB inactives sur le plan gratuit)

## 🆘 Si tu ne trouves pas DATABASE_URL

Dis-moi et je t'aiderai à :
1. Vérifier l'intégration Neon sur Vercel
2. Ou créer une nouvelle base de données Neon si nécessaire
