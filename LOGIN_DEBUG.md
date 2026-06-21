# 🔍 Debug Login - Problèmes identifiés

## Bug #1 : Redondance de query Prisma
**Fichier** : `app/api/auth/login/route.ts`
**Lignes** : 21 et 29

```typescript
// Ligne 21 : verifyPassword fait déjà un findUnique
const isValid = await verifyPassword(email, password);

// Ligne 29 : Deuxième findUnique inutile
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, email: true, name: true },
});
```

**Problème** : Deux requêtes DB pour la même chose
**Impact** : Performance, mais pas de bug fonctionnel

---

## Bug #2 : JWT_SECRET fallback non sécurisé
**Fichier** : `app/api/auth/login/route.ts` (ligne 6-8)
**Fichier** : `middleware.ts` (ligne 5-7)

```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);
```

**Problème** : Si JWT_SECRET n'est pas défini, utilise un secret par défaut
**Impact** : Non sécurisé, mais ne devrait pas causer de bug de login

---

## Bug #3 : router.refresh() après router.push()
**Fichier** : `app/login/page.tsx` (ligne 36-37)

```typescript
router.push("/");
router.refresh();
```

**Problème** : `refresh()` peut interférer avec la redirection
**Impact** : Peut causer des problèmes de navigation après login

---

## Bug #4 : Cookie sameSite "lax" en production
**Fichier** : `app/api/auth/login/route.ts` (ligne 57)

```typescript
sameSite: "lax",
```

**Problème** : "lax" peut parfois ne pas fonctionner correctement en HTTPS
**Impact** : Cookie peut ne pas être envoyé sur certaines requêtes

---

## 🎯 Solutions recommandées

1. **Corriger la redondance** : Retourner l'utilisateur depuis `verifyPassword`
2. **Forcer JWT_SECRET** : Faire échouer si pas défini
3. **Supprimer router.refresh()** : Utiliser seulement `router.push()`
4. **Changer sameSite** : Utiliser "strict" en production
