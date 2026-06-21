# Configuration de l'authentification

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env.local` (et sur Vercel) :

```bash
JWT_SECRET="votre-secret-jwt-min-32-caracteres"
ADMIN_EMAIL="admin@marsmerch.com"
ADMIN_PASSWORD="votre-mot-de-passe-securise"
ADMIN_NAME="Admin"
```

### Générer un JWT_SECRET sécurisé

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32
```

## Installation locale

### 1. Appliquer les migrations

```bash
npx prisma migrate deploy
```

### 2. Créer l'utilisateur admin

```bash
node scripts/create-admin.mjs
```

Cela créera un utilisateur avec les credentials définis dans `.env.local`.

### 3. Tester la connexion

1. Démarrez le serveur : `npm run dev`
2. Allez sur `http://localhost:3000/login`
3. Connectez-vous avec les credentials admin

## Déploiement sur Vercel

### 1. Ajouter les variables d'environnement

Dans le dashboard Vercel :
1. Projet > Settings > Environment Variables
2. Ajoutez :
   - `JWT_SECRET` (généré avec la commande ci-dessus)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_NAME`

### 2. Redéployer

```bash
npx vercel --prod
```

### 3. Créer l'utilisateur admin en production

Après le déploiement, exécutez le script via Vercel CLI :

```bash
npx vercel env pull .env.production
node scripts/create-admin.mjs
```

Ou créez manuellement l'utilisateur via Prisma Studio :

```bash
npx prisma studio --browser none
```

## Sécurité

⚠️ **IMPORTANT** :
- Ne commitez JAMAIS `.env.local` ou `.env.production`
- Changez le mot de passe admin après la première connexion
- Utilisez un JWT_SECRET différent pour chaque environnement
- Le JWT_SECRET doit avoir au moins 32 caractères

## Architecture

- **Login** : `/app/login/page.tsx`
- **API Login** : `/app/api/auth/login/route.ts`
- **API Logout** : `/app/api/auth/logout/route.ts`
- **Middleware** : `/middleware.ts` (protège toutes les routes)
- **Helpers** : `/lib/auth-simple.ts`, `/lib/auth-middleware.ts`

## Fonctionnement

1. L'utilisateur se connecte via `/login`
2. L'API vérifie les credentials et génère un JWT
3. Le JWT est stocké dans un cookie HTTP-only
4. Le middleware vérifie le JWT sur chaque requête
5. Les routes non authentifiées redirigent vers `/login`

## Ajouter un nouvel utilisateur

Créez un script similaire à `create-admin.mjs` ou ajoutez une route API protégée pour la création d'utilisateurs.
