# DA — Ridoux Couverture Charpente

## Ce qu'il faut dépasser

Les sites de couvreurs de la Loire (ex. beaufils.fr, annuaires obat / 118712) suivent tous le même gabarit :
diaporama de photos, « Bienvenue », six cartes de services, bloc histoire, grille de références, logos de labels.
Aucun ne montre d'avant/après, d'avis ou de vraie carte de zone, et aucun n'explique comment un toit est fait.
Ridoux part sans site : il peut être le seul du secteur à **montrer** son métier au lieu de l'énumérer.

## Trois pistes

1. **« Vu du faîtage »** — les photos du client sont presque toutes prises depuis le toit, pieds sur les tuiles.
   Le site serait vécu à la première personne, du faîtage jusqu'à la rue.
   *Limite* : ces photos pieds dans le cadre sont authentiques mais amateurs ; en faire le visuel principal tirerait le site vers le bas.
2. **« De père en fils »** — un site patrimonial, deux générations, la transmission.
   *Limite* : aucune photo d'archive, aucune date du père ; on tomberait dans le réflexe crème + serif + nostalgie.
3. **« Tiré au cordeau »** — le cordeau à tracer est l'outil que le couvreur claque sur les liteaux avant de poser chaque rang de tuiles.
   L'expression « tiré au cordeau » veut dire : impeccable, droit, sans écart. C'est exactement ce que dit le client :
   « On aime le travail bien fait, on tient nos engagements », ponctualité, suivi de A à Z.

**Choix : piste 3**, parce que le cordeau est à la fois un vrai geste du métier et la traduction littérale des valeurs du client.
On garde de la piste 1 l'ordre des sections (on descend la maison du faîtage au seuil) et de la piste 2 la signature « De père en fils » du logo.

## Le concept

Le site est **tracé au cordeau** et se lit **du faîtage au seuil**.
On commence en haut du toit, on traverse les couches d'une toiture, on descend la gouttière, la façade, jusqu'au sol et à la porte : le contact.
Chaque section aligne ce qui compte sur une ligne rouge tendue, comme le couvreur aligne ses rangs.

## L'objet-fil : le cordeau rouge

Une seule ligne rouge (le rouge du logo, celui de la craie à tracer), qui change de rôle en descendant la maison :

| Section | Le cordeau devient |
|---|---|
| Intro | le toit du logo RC, tracé d'un trait |
| Haut de page | les lignes de rang claquées sur la toiture 3D, avant la pose des tuiles |
| L'entreprise | la ligne du suivi « de A à Z », qui se coche étape par étape |
| Savoir-faire | le trait de coupe qui sépare les couches de la toiture |
| Entretien | la limite entre le sale et le propre, au passage de la lance |
| Réalisations | la ligne de partage avant / après, inclinée à la pente du toit |
| Façade et sol | le fil à plomb qui descend le long du mur jusqu'au sol |
| SOS Toiture | le toit qui arrête la pluie |
| Zone | les trajets tracés depuis Le Chambon-Feugerolles |
| Contact | le trait sur lequel on écrit sa demande |

En remontant, chaque ligne se rembobine (toutes les animations de ligne sont liées au défilement).

## Palette — « zinc, ardoise, tuile, craie »

Pas de crème, pas de noir pur. Les tuiles des photos apportent la chaleur ; l'interface reste minérale.

| Rôle | Nom | Valeur |
|---|---|---|
| Base claire (ciel, zinc) | `--zinc-50` | `#ECEEEC` |
| Base | `--zinc-100` | `#E3E6E3` |
| Filets, surfaces | `--zinc-300` | `#C9CECB` |
| Texte secondaire | `--zinc-600` | `#646D6B` |
| Pierre (bas de maison) | `--pierre` | `#D4CEC4` |
| Ardoise (sections sombres) | `--ardoise-800` | `#262E31` |
| Ardoise profonde (texte, pied) | `--ardoise-900` | `#1B2124` |
| Tuile (matière 3D seulement, jamais d'interface) | `--tuile` | `#B4552F` |
| **Accent unique : rouge cordeau** | `--cordeau` | `#C2352B` |

Le rouge reste rare : le cordeau, l'état actif d'un champ, SOS Toiture. Jamais en aplat de fond.
Le fond du site glisse lentement du ciel (zinc très clair) vers la pierre puis l'ardoise du pied de page : on descend la maison.

## Typographie — deux voix

- **Archivo** (variable, graisse + largeur), la voix de l'entreprise : titres en largeur étendue (wdth 112–118), comme le lettrage du camion,
  boutons, chiffres utiles, légendes. Titres en minuscules, approche légère positive, jamais serrés au contact.
- **Newsreader** (variable, avec tailles optiques), la voix d'Anthony : l'histoire, les explications, en romain.
  L'italique n'est utilisé qu'une fois : la signature « De père en fils ».

Tailles à 1440 px : titre principal 74 px, titres de section 48–54 px, texte 18 px, légendes 14 px.
Polices auto-hébergées (paquets Fontsource, fichiers woff2 servis par Vite).

## Grille

12 colonnes, marges latérales `clamp(48px, 4.6vw, 96px)`, gouttière 24 px (32 px au-delà de 1680 px).
Rythme vertical sur 8 px. Les lignes rouges tombent toujours sur un bord de colonne : le site est littéralement aligné au cordeau.

## Langage du mouvement — « tendre, claquer, poser »

- **Tendre** : les éléments arrivent en ligne droite, le long d'un axe (horizontal, vertical ou la pente du toit), jamais en diagonale libre.
- **Claquer** : départ rapide, arrivée longue et douce (`expo.out`, 0,9 à 1,2 s). Aucun rebond, aucune élasticité.
- **Poser** : une fois en place, rien ne bouge plus ; seuls la lumière de la 3D et le défilement continuent.
- Les accents (soulignés rouges) se déposent de gauche à droite au moment où on lit la ligne, comme la craie.
- Défilement lissé par Lenis, branché sur le ticker GSAP ; toutes les animations de défilement sont réversibles.
- Une seule séquence épinglée longue (la coupe de la toiture), une courte (la lance).

## Plan section par section

### 0. Intro (chargement, puis ≈ 1,3 s)
Fond ciel. Le toit du logo se trace d'un trait rouge, le monogramme RC se pose dessous.
Puis le toit du logo s'agrandit et glisse jusqu'au faîtage de la toiture 3D : le voile s'ouvre sur le haut de page.
*Transition* : le trait du logo devient le faîtage.

### 1. Haut de page — le faîtage
- **Contenu** : titre « Couvreur et charpentier dans la Loire et la Haute-Loire », les quatre métiers principaux, particuliers et professionnels,
  bouton « Demander un devis gratuit », téléphone en grand, garantie décennale, SOS Toiture dans la navigation.
- **Idée signature** : une maquette de toiture en 3D temps réel (Three.js) : charpente, écran, liteaux, tuiles romanes, faîtage, chéneau.
  À l'ouverture, des cordeaux rouges sont claqués sur les liteaux, puis les tuiles se posent rang par rang, de l'égout au faîtage, comme sur un vrai chantier.
  Le soleil suit doucement le curseur : les ombres des tuiles glissent.
- **Sortie** : le haut de page reste en place, la section suivante monte par-dessus avec un bord découpé au profil des tuiles (le recouvrement d'un rang sur l'autre).

### 2. L'entreprise — de père en fils
- **Contenu** : l'histoire d'Anthony (texte du client), depuis le 5 décembre 2011, les valeurs, ce qui les distingue, le suivi de A à Z.
- **Idée signature** : l'histoire posée comme une lettre (Newsreader), en regard d'une photo d'un couvreur sur le faîtage qui se dévoile par le haut.
  Dessous, « Le suivi, de A à Z » : un cordeau tendu sur toute la largeur, cinq étapes qui se cochent une à une au défilement.
- **Sortie** : le fond glisse vers l'ardoise, la maquette 3D revient.

### 3. Savoir-faire — la toiture, couche par couche
- **Contenu** : toutes les prestations de toiture expliquées sur leur couche : charpente et traitement, isolation des combles,
  écran et liteaux, tuiles (réfection, dépose et pose), faîtage, chéneaux zinc / PVC / alu, planches de rive PVC / alu.
- **Idée signature** : vue éclatée de la maquette, épinglée : les couches se séparent le long du trait de coupe rouge,
  chaque couche reçoit son étiquette. Survol d'une étiquette : la couche s'allume, une photo réelle du client apparaît.
  Puis la liste complète des prestations, présentée comme les lignes d'un devis bien fait.
- **Sortie** : la maquette se referme, s'efface ; la section suivante s'ouvre dans un cadre qui s'agrandit, comme une fenêtre de toit.

### 4. Entretien — nettoyage et traitement
- **Contenu** : nettoyage de toiture, traitement hydrofuge coloré ou incolore, avec la vidéo du client.
- **Idée signature** : un toit moussu nettoyé passe par passe au défilement (photos réelles du client, chantier en cours) ;
  à côté, un schéma animé explique l'hydrofuge : la goutte pénètre la tuile non traitée, perle et glisse sur la tuile traitée.
- **Sortie** : la dernière image rétrécit et se range dans la grille des réalisations.

### 5. Réalisations — avant, après
- **Contenu** : six chantiers avant/après pris du même point de vue, plus un chantier de réfection en trois temps.
- **Idée signature** : six comparaisons visibles d'un coup ; la ligne de partage est inclinée à la pente du toit et suit le curseur.
  Le chantier de réfection se lit de gauche à droite : vieux voligeage, écran et liteaux, tuiles neuves.
- **Sortie** : le cordeau devient chéneau horizontal puis tombe à la verticale.

### 6. Façade, dallage, maçonnerie — jusqu'au sol
- **Contenu** : nettoyage de façade, nettoyage de dallage et de pavés, petits travaux de maçonnerie.
- **Idée signature** : un fil à plomb rouge descend le long de la section ; la façade se lave de haut en bas sur la photo avant/après,
  le fil s'arrête sur les pavés.
- **Sortie** : le sol devient le bord supérieur de la bande SOS.

### 7. SOS Toiture
- **Contenu** : urgence et dépannage, appel direct, [À FOURNIR : horaires et délais].
- **Idée signature** : fond ardoise, une pluie fine tombe et ruisselle sur la ligne de toit rouge ; dessous, à l'abri, le numéro en très grand.
- **Sortie** : la pluie s'arrête au bord, la section des avis remonte.

### 8. Avis clients
- **Contenu** : avis Google [À FOURNIR], lien vers la fiche.
- **Idée signature** : trois emplacements d'avis visibles d'un coup, composés comme des citations ; clairement marqués à fournir.

### 9. Zone d'intervention
- **Contenu** : Loire, Haute-Loire, Rhône-Alpes, au départ du Chambon-Feugerolles.
- **Idée signature** : carte vectorielle (contours IGN) : la Loire et la Haute-Loire se remplissent, les trajets se tracent depuis le siège.
- **Sortie** : un dernier trajet file vers le formulaire.

### 10. Contact — la porte
- **Contenu** : formulaire de devis gratuit, téléphone, e-mails, adresse, diagnostic / devis / déplacement gratuits.
- **Idée signature** : chaque champ repose sur un cordeau gris qui se tend en rouge quand on écrit.
- **Pied de page** : sobre, sur l'ardoise : logo, liens, mentions légales courtes.

## Ce qui a été écarté (réponses par défaut)
- Diaporama plein écran de photos de toits → remplacé par la maquette 3D construite rang par rang.
- Six cartes « icône + titre + texte » → remplacées par la vue éclatée et la liste façon devis.
- Carrousel d'avis à faire défiler → trois avis visibles d'un coup.
- Fond crème + serif + terracotta → zinc et ardoise, le terracotta reste dans la matière.
- Rangée de compteurs → aucune ; une seule date fournie (2011) et elle est écrite telle quelle.

## Révision après le retour n° 1 (20/10/2026)

- **Accent** : le rouge cordeau devient l'**orange du logo** fourni (#E8641C à l'écran). Un cordeau à tracer peut être orange : le fil rouge du concept tient.
- **Haut de page** : titre, un filet, une phrase, un seul bouton. Plus de numéro ni de mentions empilées. La maquette suit davantage la souris.
- **Curseur** : celui du système.
- **Suivi de A à Z** : se déroule seul, une fois, quand il arrive à l'écran.
- **Coupe** : chaque étiquette pointe du côté où elle se trouve (pan arrière et pignon droit à droite, pan avant et pignon gauche à gauche), traits coudés sans croisement, points cerclés.
- **SOS Toiture** : la maquette revient une dernière fois, vue depuis le pignon : elle devient une maison sous la pluie. Le mur du pignon porte le numéro et se fond vers le bas. C'est la fin du voyage de l'objet-fil : construite au haut de page, ouverte dans la coupe, abritante au SOS.
- **Pied de page** : bord en rang de tuiles, logo, phrase, bouton, trois colonnes, mentions légales.

## Révision après le retour n° 4 (21/10/2026) — « le toit vivant »

Le haut de page gardait une maquette parfaite mais inerte. Trois idées tirées du chantier lui donnent de la vie, sans ajouter un seul élément d'interface :
- **La météo** : des ombres de nuages glissent sur les tuiles, lentement, comme un vrai matin sur un toit. Le soleil suit toujours le curseur.
- **La main du couvreur** : sous le curseur, les tuiles se soulèvent d'un cran puis retombent en vague amortie, comme quand on vérifie une tuile.
- **La craie du cordeau** : pendant la construction, chaque cordeau claqué vibre et lâche une bouffée de craie orange. Le souligné de « Loire » et « Haute-Loire » claque au même moment.
La maquette est plus grande dans le cadre, et la caméra respire très lentement pour que l'image ne soit jamais figée.

### Précision du client : aller plus loin qu'« un texte à gauche, la 3D à droite »

Le haut de page devient une scène entière, en plein écran, comme une maquette d'architecte posée sur une table :
- la maison du client sort de terre (les murs montent), puis sa toiture se construit couche par couche, et la cheminée se pose à la fin ;
- elle est posée dans un paysage de prairie qui monte en collines au loin, dessinées de courbes de niveau, comme une carte du Pilat ;
- les ombres des nuages traversent la maison et les collines ; la brume du lointain a la couleur du ciel de la page ;
- le texte est posé dans ce paysage, et le soleil, les tuiles et la caméra réagissent au curseur.

### Retour n° 5 — « De la maquette au chantier »

Le haut de page raconte le métier en un seul geste de défilement :
1. **Au-dessus des nuages** : la toiture se construit couche par couche, posée sur une mer de nuages. Le ciel est une vraie photographie (« Evening Road 01 », Poly Haven, CC0) qui éclaire aussi les tuiles.
2. **La plongée** : au défilement, le texte s'efface et la caméra plonge jusqu'au faîtage.
3. **Le raccord** : au même angle, la photo réelle d'un faîtage refait par le client se pose par rangs, de l'égout au faîtage, un cordeau orange marquant le rang en cours. La maquette devient le chantier.
C'est la seconde séquence épinglée du site (la première est la coupe), courte : 150 % de hauteur d'écran.

### Retour n° 6 — « Entrer dans la toiture »

Le raccord vers une photo est abandonné. Le haut de page devient un voyage continu dans la maquette :
1. La toiture se construit au-dessus d'une mer de nuages (vrai ciel, Poly Haven, CC0).
2. Au défilement, la caméra plonge vers le pan avant. Autour du point d'entrée, les tuiles se soulèvent et s'envolent ; l'écran sous-toiture se déchire ; les cordeaux orange et les liteaux défilent sous la caméra.
3. On passe entre deux chevrons et l'on se retrouve dans les combles : la charpente en enfilade, la pénombre, un rai de lumière qui tombe du trou, des poussières en suspension.
4. La coupe reprend sans coupure : la caméra ressort, les tuiles reviennent se poser, et le toit s'éclate couche par couche avec ses étiquettes.
Les couches traversées s'affichent au passage, en grand, en bas à gauche.

### Retours n° 7 et 8 — « Un soir, une couche après l'autre »

**Le haut de page avant le défilement.** Fini le « texte à gauche, 3D à droite » et la mer de nuages :
- un ciel de fin de journée en dégradé (ardoise en haut, lueur chaude à l'horizon qui respire lentement), sans photo ;
- le titre « Couvreur et charpentier » en très grand, sur toute la largeur, posé derrière la maquette : la toiture se construit devant les lettres et en masque le bas ;
- autour, des tuiles en suspens à plusieurs profondeurs qui tournent lentement, et une poussière dorée dans l'air ; au curseur, les plus proches bougent moins que la caméra, pour donner de la profondeur sans traverser l'écran ;
- en bas : la zone (« dans la Loire et la Haute-Loire ») à gauche, la phrase de présentation à droite, sans bouton.

**La descente, couche par couche** (en écrans défilés : 3 pour le haut de page, 2 pour la coupe) :
1. Les tuiles s'envolent autour du point d'entrée (vue d'assez haut pour voir le trou s'ouvrir).
2. **Les liteaux** : la caméra ralentit au-dessus des liteaux et des cordeaux, en lumière rasante ; ils s'éclairent un instant, puis sont déposés travée par travée (coupés au droit des chevrons).
3. **L'écran sous-toiture** : l'écran nu, qui s'éclaire à son tour, puis se déchire ; la lumière plonge dans les combles.
4. **La charpente** : on passe entre deux chevrons, puis l'on recule lentement le long de la charpente.
5. La coupe reprend ce recul sans le casser : on ressort par le pignon, le toit se referme dans l'ordre inverse (écran, liteaux, tuiles), puis s'éclate.

Ce qui est en l'air (tuiles, liteaux) ne se fige jamais : même sans défilement, chaque pièce tangue et dérive doucement.

**Chargement.** Le logo, l'anneau orange qui tourne et le nom de l'entreprise s'affichent dès la première image, en CSS (le logo est inclus dans la page). Dès que la 3D est prête, l'anneau se referme et rejoint le logo de la navigation pendant que le voile s'ouvre sur le soir.
