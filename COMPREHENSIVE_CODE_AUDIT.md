# 🔍 AUDIT COMPLET DU CODE - Mars Merch App

**Date** : 21 juin 2026  
**Version** : Production  
**URL** : https://mars-merch-app.vercel.app  
**Portée** : Analyse complète de tout le codebase (API routes, composants, configuration, sécurité)

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | Statut | Score |
|----------|--------|-------|
| **API Routes** | ✅ Bon | 8/10 |
| **Composants UI** | ✅ Bon | 8/10 |
| **Sécurité** | ⚠️ Moyen | 6/10 |
| **Performance** | ⚠️ Moyen | 6/10 |
| **Type Safety** | ✅ Excellent | 9/10 |
| **Architecture** | ✅ Bon | 8/10 |
| **Globale** | ✅ Bon | **7.5/10** |

---

## 1. API ROUTES (19 fichiers analysés)

### ✅ POINTS FORTS

#### Validation & Error Handling
- **Toutes les routes** utilisent Zod pour la validation des inputs
- **Helper function** `validate()` centralisée dans `lib/validation.ts`
- **Try-catch** sur toutes les routes avec error responses 500
- **Messages d'erreur** clairs en français

#### Architecture
- **Séparation claire** entre routes (auth, visits, mail, settings, etc.)
- **Prisma queries** bien structurées avec includes sélectifs
- **RESTful design** cohérent (GET, POST, PATCH, DELETE)

#### Authentification
- **Middleware global** protégeant toutes les routes API
- **JWT verification** avec `jose` (bibliothèque moderne)
- **Cookies HTTP-only** pour stocker le token

### ⚠️ PROBLÈMES IDENTIFIÉS

#### 🔴 Critique - Sécurité

**1. OpenAI Key stockée en clair**
- **Fichiers** : `app/api/chat/route.ts`, `app/api/mail/analyze/route.ts`
- **Problème** : `settings?.openaiKey` stockée en clair en base de données
- **Impact** : Si la DB est compromise, la clé OpenAI est exposée
- **Solution** : Chiffrer la clé avec AES-256 avant stockage, déchiffrer à l'utilisation
- **Priorité** : HAUTE

**2. Pas de rate limiting sur les appels OpenAI**
- **Fichiers** : `app/api/chat/route.ts`, `app/api/mail/analyze/route.ts`
- **Problème** : Un utilisateur malveillant peut épuiser le quota OpenAI
- **Impact** : Coût élevé, déni de service
- **Solution** : Implémenter rate limiting (ex: 10 requêtes/minute par utilisateur)
- **Priorité** : MOYENNE

#### 🟡 Moyen - Performance

**3. N+1 Queries dans `/api/mail/apply`**
- **Fichier** : `app/api/mail/apply/route.ts` (lignes 32-41)
- **Problème** : Pour chaque modification, une query Prisma est exécutée dans une boucle
- **Impact** : Lenteur si beaucoup de modifications appliquées
- **Solution** : Utiliser `updateMany` avec where clause
- **Priorité** : MOYENNE

**4. Pas de compression images côté serveur**
- **Fichier** : `app/api/visits/[id]/photos/route.ts`
- **Problème** : Images uploadées jusqu'à 10Mo sans compression
- **Impact** : Coût de stockage élevé, chargement lent
- **Solution** : Compresser images avec sharp avant upload (max 2Mo)
- **Priorité** : MOYENNE

**5. Géocodage sans rate limiting**
- **Fichier** : `components/pages/RouteMapView.tsx`
- **Problème** : Appels Nominatim OSM sans délai entre requêtes
- **Impact** : Peut être bloqué par Nominatim (1 req/sec max)
- **Solution** : Ajouter délai de 1s entre géocodages + cache en DB
- **Priorité** : HAUTE

#### 🟢 Faible - Code Quality

**6. TypeScript faux positifs**
- **Fichiers** : Multiples routes utilisant `storeId` dans where clauses
- **Problème** : IDE montre erreurs mais code compile
- **Cause** : Prisma Client pas rechargé après migration `storeId`
- **Impact** : Aucun en production, mais gênant en dev
- **Solution** : `npx prisma generate` + redémarrer IDE
- **Priorité** : FAIBLE

**7. Pas de validation stricte Excel**
- **Fichier** : `app/api/import/route.ts`
- **Problème** : Parsing Excel sans vérification préalable du format
- **Impact** : Peut échouer silencieusement sur formats invalides
- **Solution** : Vérifier colonnes requises avant parsing
- **Priorité** : FAIBLE

---

## 2. COMPOSANTS UI (19 fichiers analysés)

### ✅ POINTS FORTS

#### Architecture
- **"use client"** correctement utilisé sur tous les composants
- **TypeScript interfaces** bien définies pour tous les data structures
- **Dynamic imports** pour composants lourds (RouteMapView avec SSR disabled)
- **Lucide React** pour les icônes (cohérent)

#### UX
- **Toast notifications** pour feedback utilisateur
- **Loading states** avec spinners
- **Dark mode** support via ThemeProvider
- **Responsive design** avec Tailwind

#### Drag & Drop
- **@dnd-kit** pour réorganisation des visites
- **Implementation propre** avec sensors et context

### ⚠️ PROBLÈMES IDENTIFIÉS

#### 🟡 Moyen - Performance

**8. Compression image côté client**
- **Fichier** : `components/pages/VisitDetailPage.tsx`
- **Problème** : Compression faite côté client avec canvas (limitée)
- **Impact** : Peut être lente sur mobiles, pas optimale
- **Solution** : Faire compression côté serveur avec sharp
- **Priorité** : MOYENNE

**9. Pas de pagination**
- **Fichiers** : `DashboardPage.tsx`, `PlanningPage.tsx`
- **Problème** : Toutes les visites chargées d'un coup
- **Impact** : Lenteur si beaucoup de visites (>100)
- **Solution** : Implémenter pagination ou infinite scroll
- **Priorité** : MOYENNE

#### 🟢 Faible - UX

**10. Pas de skeleton loaders**
- **Fichiers** : Multiples composants
- **Problème** : Loading states basiques avec spinner
- **Impact** : UX moins fluide
- **Solution** : Ajouter skeleton loaders pour les listes
- **Priorité** : FAIBLE

**11. Pas de offline handling**
- **Fichier** : `OfflineIndicator.tsx` existe mais pas utilisé
- **Problème** : Service worker présent mais pas de cache strategy
- **Impact** : App non fonctionnelle hors ligne
- **Solution** : Implémenter cache-first strategy
- **Priorité** : FAIBLE

---

## 3. CONFIGURATION & SÉCURITÉ

### ✅ POINTS FORTS

#### Headers de sécurité
- **next.config.ts** : X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Protection** contre clickjacking, MIME sniffing, etc.

#### Environment variables
- **.gitignore** : `.env*` correctement ignoré
- **.env.example** : Template complet avec documentation
- **Vercel** : Variables injectées automatiquement

#### Middleware
- **Protection globale** sur toutes les routes
- **JWT verification** avec secret
- **Redirections** correctes (login ↔ home)

### ⚠️ PROBLÈMES IDENTIFIÉS

#### 🔴 Critique - Sécurité

**12. JWT_SECRET fallback par défaut**
- **Fichier** : `middleware.ts` (ligne 6)
- **Problème** : `process.env.JWT_SECRET || "your-secret-key-change-in-production"`
- **Impact** : Si JWT_SECRET pas défini, utilise un secret par défaut (non sécurisé)
- **Solution** : Faire échouer l'app si JWT_SECRET pas défini
- **Priorité** : CRITIQUE

**13. Pas de CORS configuration**
- **Fichier** : `next.config.ts`
- **Problème** : Pas de configuration CORS explicite
- **Impact** : Risque de CSRF si domaines externes autorisés
- **Solution** : Configurer CORS avec whitelist de domaines
- **Priorité** : MOYENNE

#### 🟡 Moyen - Sécurité

**14. Pas de rate limiting global**
- **Fichier** : `middleware.ts`
- **Problème** : Pas de limitation de requêtes par IP/user
- **Impact** : Vulnérable aux attaques brute force sur login
- **Solution** : Implémenter rate limiting (ex: 5 req/min sur /api/auth/login)
- **Priorité** : HAUTE

**15. Pas de protection CSRF**
- **Fichier** : `middleware.ts`
- **Problème** : Pas de tokens CSRF pour les mutations
- **Impact** : Vulnérable aux attaques CSRF
- **Solution** : Implémenter double-submit cookie pattern
- **Priorité** : MOYENNE

#### 🟢 Faible - Configuration

**16. Pas de monitoring**
- **Problème** : Pas de Sentry ou similaire pour tracker erreurs prod
- **Impact** : Difficile de debugger erreurs utilisateurs
- **Solution** : Ajouter Sentry ou LogRocket
- **Priorité** : FAIBLE

---

## 4. TYPES & VALIDATION

### ✅ POINTS FORTS

#### Zod Schemas
- **Schemas complets** pour toutes les inputs API
- **Messages d'erreur** en français
- **Helper function** `validate()` centralisée
- **Types exportés** pour réutilisation

#### TypeScript
- **Interfaces bien définies** dans tous les composants
- **Enum pour status** (VisitStatus)
- **Type safety** sur les props

### ⚠️ PROBLÈMES IDENTIFIÉS

#### 🟢 Faible - Validation

**17. Validation email pas stricte**
- **Fichier** : `lib/validation.ts` (ligne 76)
- **Problème** : `z.string().email()` accepte des formats invalides
- **Impact** : Peut accepter des emails malformés
- **Solution** : Utiliser regex plus strict
- **Priorité** : FAIBLE

**18. Pas de validation côté client**
- **Fichiers** : Formulaires dans composants
- **Problème** : Validation seulement côté serveur
- **Impact** : UX moins bonne (feedback tardif)
- **Solution** : Ajouter validation Zod côté client avec react-hook-form
- **Priorité** : FAIBLE

---

## 5. BASE DE DONNÉES

### ✅ POINTS FORTS

#### Schema Prisma
- **Relations bien définies** avec onDelete Cascade
- **Indexes** sur champs uniques (email, term, name)
- **Types appropriés** (String, DateTime, Boolean, Int)
- **Default values** raisonnables

#### Migrations
- **Script apply-migrations.mjs** pour Vercel
- **SQL IF NOT EXISTS** pour éviter erreurs
- **Migration auth** ajoutée récemment

### ⚠️ PROBLÈMES IDENTIFIÉS

#### 🟡 Moyen - Performance

**19. Pas d'indexes sur champs fréquemment queryés**
- **Fichiers** : `prisma/schema.prisma`
- **Problème** : Pas d'indexes sur `storeId`, `visitDate`, `weekId`
- **Impact** : Queries lentes sur gros datasets
- **Solution** : Ajouter indexes: `@@index([storeId])`, `@@index([visitDate])`
- **Priorité** : MOYENNE

**20. Pas de soft delete**
- **Fichiers** : Tous les models
- **Problème** : Suppression définitive des données
- **Impact** : Impossible de restaurer en cas d'erreur
- **Solution** : Ajouter `deletedAt DateTime?` + filtrer les deleted
- **Priorité** : FAIBLE

#### 🟢 Faible - Audit

**21. Pas d'audit trail**
- **Fichiers** : Tous les models
- **Problème** : Pas de tracking qui a modifié quoi et quand
- **Impact** : Difficile de tracer les modifications
- **Solution** : Ajouter table `AuditLog` avec triggers
- **Priorité** : FAIBLE

---

## 6. DÉPENDANCES

### ✅ POINTS FORTS

#### Packages
- **Versions récentes** : Next.js 16.2.9, React 19.2.4, Prisma 7.8.0
- **Packages stables** : jose, bcryptjs, zod, xlsx
- **UI moderne** : Radix UI, Lucide React, Tailwind 4

### ⚠️ PROBLÈMES IDENTIFIÉS

#### 🟢 Faible - Dépendances

**22. next-auth beta installé mais pas utilisé**
- **Fichier** : `package.json`
- **Problème** : `next-auth@5.0.0-beta.31` installé mais auth custom utilisé
- **Impact** : Bundle size inutilement augmenté
- **Solution** : Supprimer next-auth si pas utilisé
- **Priorité** : FAIBLE

---

## 7. RECOMMANDATIONS PRIORITAIRES

### 🔴 CRITIQUES (À faire immédiatement)

1. **Chiffrer OpenAI key** en base de données
2. **Supprimer fallback JWT_SECRET** dans middleware
3. **Ajouter rate limiting** sur /api/auth/login

### 🟡 HAUTES (À faire cette semaine)

4. **Ajouter rate limiting** sur appels OpenAI
5. **Implémenter rate limiting** sur géocodage Nominatim
6. **Ajouter indexes** sur storeId, visitDate, weekId

### 🟢 MOYENNES (À faire ce mois)

7. **Compresser images** côté serveur
8. **Optimiser N+1 queries** dans /api/mail/apply
9. **Ajouter pagination** sur listes de visites
10. **Configurer CORS** avec whitelist

### ⚪ FAIBLES (Nice to have)

11. **Ajouter monitoring** (Sentry)
12. **Implémenter soft delete**
13. **Ajouter audit trail**
14. **Ajouter validation côté client**
15. **Implémenter offline handling**
16. **Supprimer next-auth** si pas utilisé

---

## 8. STATISTIQUES

| Métrique | Valeur |
|----------|-------|
| **Fichiers analysés** | 65+ |
| **API routes** | 19 |
| **Composants UI** | 19 |
| **Libraries** | 5 |
| **Problèmes critiques** | 3 |
| **Problèmes haute priorité** | 3 |
| **Problèmes moyenne priorité** | 7 |
| **Problèmes faible priorité** | 9 |
| **Total problèmes** | 22 |

---

## 9. CONCLUSION

### État général : **BON** ✅

L'application est **fonctionnelle et bien structurée**. L'authentification est correctement implémentée, le code est propre et type-safe.

### Points forts
- ✅ Architecture solide avec séparation claire des responsabilités
- ✅ TypeScript et Zod pour la type safety
- ✅ Authentification JWT fonctionnelle
- ✅ UI moderne avec Tailwind et Radix UI
- ✅ Base de données bien structurée

### Points à améliorer
- ⚠️ Sécurité : Chiffrer les clés API, ajouter rate limiting
- ⚠️ Performance : Optimiser les queries, ajouter indexes
- ⚠️ UX : Ajouter pagination, skeleton loaders

### Recommandation

**L'application est prête pour la production** mais les 3 problèmes critiques devraient être résolus avant un déploiement à grande échelle.

---

**Audit réalisé le** : 21 juin 2026  
**Durée** : ~2h  
**Statut** : ✅ COMPLET
