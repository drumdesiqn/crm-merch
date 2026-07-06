# CPM Mars — Merchandiser Planning App

Application de gestion de planning et suivi terrain pour merchandisers CPM chez Mars Belgique.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes (App Router) |
| Base de données | PostgreSQL (Neon) via Prisma 7 |
| Auth | JWT (jose) + HTTP-only cookies |
| IA | OpenAI GPT-4o (analyse mails, assistant) |
| Storage | Vercel Blob (photos) |
| Deploy | Vercel (auto-deploy sur `master`) |
| Tests | Vitest (unit), Playwright (E2E) |
| CI | GitHub Actions + Vercel Build Pipeline |

## Getting Started

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local
# Remplir les variables : DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN

# Lancer le dev server
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL Neon |
| `JWT_SECRET` | Clé secrète pour signer les JWT (min 32 chars) |
| `OPENAI_API_KEY` | Clé API OpenAI pour analyse mail et assistant |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob pour photos |
| `CRON_SECRET` | Secret pour authentifier les crons Vercel |

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Dev server local |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run test:run` | Tests unitaires (Vitest, one-shot) |
| `npm test` | Tests unitaires (watch mode) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run test:ci` | lint + tests + playwright list |
| `npm run vercel-build` | Build Vercel complet (migrations + lint + tests + build) |

## Architecture

```
app/
├── api/          # Routes API (REST)
├── (pages)/      # Pages Next.js (App Router)
components/
├── pages/        # Page-level client components
├── ui/           # Composants UI réutilisables
├── visit/        # Composants liés aux visites
lib/
├── validation.ts # Schémas Zod centralisés
├── client-api.ts # Fetch wrapper client
├── rate-limit.ts # Rate limiting in-memory
├── auth-simple.ts# Authentification bcrypt
prisma/
├── schema.prisma # Schéma DB
scripts/
├── apply-migrations.mjs # Migrations SQL custom
├── vercel-build.mjs     # Pipeline build Vercel
public/
├── sw.js         # Service Worker (PWA offline)
├── manifest.json # PWA manifest
e2e/              # Tests Playwright
```

## Sécurité

- Auth JWT avec cookies HTTP-only (`sameSite=lax`, `secure` en prod)
- CSP restrictive (script-src, connect-src, etc.)
- Rate limiting sur login, import, password change
- Validation Zod sur toutes les entrées API
- Protection prototype pollution sur parsing Excel
- Headers sécurité (X-Frame-Options, X-Content-Type-Options, etc.)

## Déploiement

Le déploiement est automatique via Vercel sur push `master`. Le build exécute :
1. `prisma generate`
2. Migrations SQL (si `DATABASE_URL` dispo)
3. Génération d'icônes
4. Lint + tests unitaires
5. `next build`

Un backup automatique est déclenché quotidiennement à 02:00 UTC via Vercel Cron.
