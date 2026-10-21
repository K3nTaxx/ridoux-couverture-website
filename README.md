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
(commande `npm run build`, dossier publié `dist`). Aucun réglage supplémentaire.

## Contenu du dépôt

- `index.html`, `src/` : le site (Vite, GSAP, Lenis, Three.js)
- `public/img`, `public/video`, `public/geo` : images, vidéo et carte utilisées par le site
- `sources/` : logo détouré en PNG et images préparées mais non utilisées
- `CONTENU.md`, `DA.md`, `NOTES.md` : contenu, direction artistique, retours du client

## Crédits

- Ciel du haut de page et éclairage de la 3D : « Evening Road 01 (Pure Sky) », Poly Haven (Sergej Majboroda, Jarod Guest), licence CC0.
- Contours des départements : france-geojson (Grégoire David), données IGN Admin Express, Licence ouverte.
- Photos et vidéos : Ridoux Couverture.
