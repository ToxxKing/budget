# Budget — PWA iPhone hors connexion

Application de budget personnel installable sur l'écran d'accueil de l'iPhone. Elle fonctionne sans connexion et garde toutes les données sur l'appareil.

## Mettre en ligne (une seule fois, ~5 min)

1. Crée un dépôt GitHub vide, par exemple `budget`.
2. Pousse ce dossier :
   ```bash
   git init && git add . && git commit -m "Budget v2"
   git branch -M main
   git remote add origin https://github.com/<ton-pseudo>/budget.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
4. L'onglet **Actions** lance les tests puis le build. Une fois terminé, l'appli est en ligne sur `https://<ton-pseudo>.github.io/budget/`.

Chaque `git push` sur `main` redéploie automatiquement. L'appli installée se met à jour seule à la prochaine ouverture.

> Autre hébergement possible : `npm run build`, puis envoie le contenu de `dist/` par FTP sur n'importe quel hébergement HTTPS (ex. un sous-domaine de freedev.app). Le build fonctionne à la racine comme dans un sous-dossier.

## Installer sur l'iPhone

1. Ouvre l'adresse dans **Safari** (pas Chrome : sur iOS, seul Safari installe les PWA de façon fiable).
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvre l'appli depuis l'icône. À partir de là, utilise toujours l'icône : les données de l'appli installée sont séparées de celles de Safari.

## Où sont mes données ?

| Élément | Choix | Pourquoi |
|---|---|---|
| Stockage | IndexedDB (`idb-keyval`) | Pas de limite de 5 Mo comme `localStorage`, écriture asynchrone, et c'est ce stockage que `navigator.storage.persist()` protège. |
| Protection | `navigator.storage.persist()` au lancement | Demande à iOS de ne pas effacer les données sous pression de stockage. |
| Écriture | Différée de 300 ms + écriture immédiate quand l'appli passe en arrière-plan | iOS peut fermer une PWA sans prévenir. |
| Sauvegarde | Fichier JSON via la feuille de partage iOS → « Enregistrer dans Fichiers » | Copie dans iCloud Drive, sans serveur. Rappel sur l'accueil après 7 jours (réglable). |

**À savoir :** supprimer l'icône de l'écran d'accueil efface les données. Sauvegarde avant. L'appli accepte aussi les sauvegardes JSON de la première version (artifact claude.ai).

## Développement

```bash
npm install
npm run dev      # serveur local, accessible depuis l'iPhone sur le même Wi-Fi
npm test         # tests du moteur de calcul (Vitest)
npm run build    # build de production dans dist/
```

## Architecture

```
src/
  lib/
    engine.js       Moteur de calcul pur (prévu, réel, clôture, reports, comptes, projections, objectifs)
    engine.test.js  12 tests Vitest
    defaults.js     Données de départ, catégories, migration v1 → v2
    storage.js      IndexedDB + secours localStorage, persistance, détection PWA
    backup.js       Export JSON/CSV par partage iOS, import
    store.jsx       État global (Context React), sauvegarde automatique
    dates.js, format.js
  components/       UI réutilisable, graphiques SVG, feuilles d'édition
  tabs/             Accueil, Budget, Épargne, Analyses, Réglages
```

**Choix techniques**
- **React + Vite** : build rapide, et `vite-plugin-pwa` génère le service worker (Workbox) et le manifest.
- **Tailwind CSS** : thème sombre défini une fois dans `tailwind.config.js`, classes utilitaires dans les composants.
- **Graphiques en SVG fait main** : environ 3 Ko au lieu d'environ 400 Ko pour une librairie de graphiques, et un contrôle total du toucher.
- **Police système (SF Pro)** : rendu natif iOS, aucun téléchargement, fonctionne hors connexion.
- **Moteur séparé de l'interface** : toute la logique financière est testable sans navigateur.

## Logique des calculs

- **Prévu** : salaire + revenus annexes du mois − charges fixes − dettes du mois − enveloppes (budget + report éventuel).
- **Réel** : dépenses saisies + échéances cochées (au montant prévu) + revenus annexes cochés « reçus ».
- **Reste à vivre (mois en cours)** : prévu, corrigé par le réel. Un dépassement d'enveloppe le fait baisser.
- **Clôture** : fige le mois. Les échéances non cochées peuvent être comptées payées ou ignorées. Le montant épargné est réparti entre les comptes selon leur part. On ne peut clôturer que le premier mois ouvert, et seulement le dernier mois clôturé peut être rouvert.
- **Report d'enveloppe** : en mode « Reporter », le reste d'une semaine s'ajoute à la suivante, et le reste du mois s'ajoute au budget du mois suivant. Il n'est pas compté comme épargné, puisqu'il reste disponible. En mode « Vers l'épargne », le reste est compté épargné à la clôture.
- **Intérêts** : taux annuel ÷ 12, appliqué chaque mois au solde. C'est une approximation : le Livret A calcule par quinzaine et verse les intérêts en fin d'année.
- **Objectif inversé** : (objectif − déjà de côté) ÷ nombre de mois restants, comparé au surplus du mois type.
