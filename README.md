# Ridoux Couverture — site vitrine

Site de Ridoux Couverture Charpente, couvreur et charpentier au Chambon-Feugerolles (Loire).
Réalisé par Kalion Studio.

## Lancer le site en local

Double-cliquer sur `Ouvrir le site.bat`, ou :

```bash
npm install
npm run dev
```

## Mise en ligne (Netlify)

Relier ce dépôt à Netlify : la configuration est dans `netlify.toml`
(commande `npm run build`, dossier publié `dist`).

- **Adresse du site** : les balises de partage, l'adresse canonique, `robots.txt` et `sitemap.xml` prennent
  l'adresse que Netlify fournit à la construction (variable `URL` : le nom de domaine dès qu'il est branché).
  Ailleurs que sur Netlify, la fournir avec la variable `SITE_URL` (ex. `SITE_URL=https://www.exemple.fr npm run build`).
- **Formulaire de devis** : il passe par Netlify Forms. Dans Netlify, activer *Forms → Enable form detection*,
  redéployer, puis régler l'envoi des demandes par e-mail (*Forms → Form notifications*).
- **Search Console** : une fois le domaine branché, déclarer le site dans Google Search Console et y envoyer `/sitemap.xml`.

## Contenu du dépôt

- `index.html`, `src/` : le site (Vite, GSAP, Lenis, Three.js) ; `src/styles/mobile.css` : la version téléphone et tablette
- `mentions-legales.html`, `404.html` : pages annexes
- `public/` : icônes, manifeste, image de partage (`img/og.jpg`)
- `public/img`, `public/video`, `public/geo` : images, vidéo et carte utilisées par le site
- `sources/` : logo détouré en PNG et images préparées mais non utilisées
- `CONTENU.md`, `DA.md`, `NOTES.md` : contenu, direction artistique, retours du client

## Crédits

- Éclairage de la 3D : « Evening Road 01 (Pure Sky) », Poly Haven (Sergej Majboroda, Jarod Guest), licence CC0, réduit à 256 px (`public/env/ciel-256.hdr`). Le ciel du haut de page est un dégradé en CSS.
- Contours des départements : france-geojson (Grégoire David), données IGN Admin Express, Licence ouverte.
- Photos et vidéos : Ridoux Couverture.
