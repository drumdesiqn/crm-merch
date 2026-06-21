# 🚀 Guide de configuration Vercel - ÉTAPES FINALES

## ✅ Déploiement réussi !
L'app est déployée sur : **https://mars-merch-app.vercel.app**

## ⚠️ IMPORTANT : Ajouter les variables d'environnement

### Étape 1 : Aller sur le dashboard Vercel
1. Ouvre ce lien : https://vercel.com/drum-designs-projects/mars-merch-app/settings/environment-variables
2. Tu verras la page "Environment Variables"

### Étape 2 : Ajouter JWT_SECRET
1. Clique sur "Add New"
2. **Name** : `JWT_SECRET`
3. **Value** : `b657a52857bdaf668f1b03caebbbc3ca07e5e52d0035bab746246a62e85b3d88`
4. **Environment** : Coche uniquement "Production"
5. Clique "Save"

### Étape 3 : Ajouter ADMIN_EMAIL
1. Clique sur "Add New"
2. **Name** : `ADMIN_EMAIL`
3. **Value** : `admin@marsmerch.com`
4. **Environment** : Coche uniquement "Production"
5. Clique "Save"

### Étape 4 : Ajouter ADMIN_PASSWORD
1. Clique sur "Add New"
2. **Name** : `ADMIN_PASSWORD`
3. **Value** : `MarsAdmin2026!`
4. **Environment** : Coche uniquement "Production"
5. Clique "Save"

### Étape 5 : Ajouter ADMIN_NAME
1. Clique sur "Add New"
2. **Name** : `ADMIN_NAME`
3. **Value** : `Admin Mars`
4. **Environment** : Coche uniquement "Production"
5. Clique "Save"

### Étape 6 : Redéployer
1. Va sur : https://vercel.com/drum-designs-projects/mars-merch-app
2. Clique sur les 3 points "..." à côté du dernier déploiement
3. Clique "Redeploy"
4. Confirme en cliquant "Redeploy" à nouveau

## 🎉 C'est terminé !

Après le redéploiement (environ 1-2 minutes) :

1. Va sur https://mars-merch-app.vercel.app
2. Tu seras redirigé vers `/login`
3. Connecte-toi avec :
   - **Email** : `admin@marsmerch.com`
   - **Password** : `MarsAdmin2026!`

## 🔐 Sécurité

⚠️ **APRÈS LA PREMIÈRE CONNEXION** :
- Change le mot de passe admin
- Supprime le fichier `ADMIN_CREDENTIALS.txt`
- Ne partage jamais le `JWT_SECRET`

## 📝 Notes

- L'authentification protège maintenant TOUTES les routes de l'app
- Le middleware vérifie automatiquement le JWT sur chaque requête
- Les cookies sont HTTP-only et sécurisés en production
- Les migrations ont été appliquées automatiquement lors du build Vercel

## ❓ Problèmes ?

Si tu ne peux pas te connecter :
1. Vérifie que les 4 variables d'environnement sont bien ajoutées
2. Vérifie que le redéploiement est terminé
3. Essaie en navigation privée (pour vider le cache)
4. Regarde les logs Vercel : https://vercel.com/drum-designs-projects/mars-merch-app/logs
