# Shaman Hotspot — App de connexion par ticket

## Ce que j'ai trouvé en lisant votre ticket

Le QR code de votre ticket contient en réalité ce lien :

```
http://10.10.10.1/login?username=67758&password=67758
```

C'est une adresse **locale** : elle n'existe que sur le réseau de votre routeur
hotspot, une fois qu'un téléphone y est déjà connecté. Voilà pourquoi le
scan échoue le plus souvent : le client scanne le QR **avant** d'avoir
rejoint le Wi-Fi "WI-FI 6 SHAMAN HOTSPOT" (avec ses données mobiles ou sans
réseau actif, son téléphone ne peut pas joindre 10.10.10.1). Quand il tape
le code à la main, c'est en général parce qu'il est déjà connecté au
Wi-Fi et voit le portail captif — donc ça marche.

**Il n'existe aucune API pour qu'une page web ou une app installée depuis
le web fasse rejoindre le Wi-Fi automatiquement à un téléphone.** Android et
iOS bloquent volontairement ceci pour la sécurité — même les grandes apps
(Orange, Starbucks, etc.) ne peuvent pas le faire. Le client doit toujours
choisir le réseau une fois, dans les réglages de son téléphone. Ce que cette
app peut faire, en revanche, c'est fiabiliser tout le reste : scanner le
ticket, lire le code, et soumettre la connexion au portail automatiquement
— sans que le client ait besoin de recopier les chiffres à la main.

## Ce que fait l'app

1. **Étape 1** — rappelle au client de rejoindre le réseau `WI-FI 6 SHAMAN
   HOTSPOT` dans les réglages Wi-Fi (réseau ouvert, sans mot de passe —
   à corriger dans `index.html` si ce n'est pas le cas, voir plus bas).
2. **Étape 2** — le client scanne le QR du ticket avec la caméra intégrée
   à l'app (librairie jsQR), ou saisit le code à 5 chiffres. L'app
   reconnaît les deux formats : le lien complet imprimé sur le ticket, ou
   un simple code numérique.
3. L'app redirige alors le téléphone vers
   `http://10.10.10.1/login?username=...&password=...` pour activer
   l'accès internet — exactement l'action qui fonctionne quand le code est
   tapé à la main dans le portail.

## Avant de publier : à vérifier / adapter

Ouvrez `index.html`, tout en haut du `<script>`, bloc `CONFIG` :

```js
const CONFIG = {
  ssid: "WI-FI 6 SHAMAN HOTSPOT",   // nom exact affiché à l'étape 1
  hotspotIp: "10.10.10.1",          // adresse de votre portail (déjà correcte)
  loginPath: "/login",              // chemin de connexion (déjà correct)
};
```

Si le réseau Wi-Fi lui-même demande un mot de passe pour le rejoindre
(pas le code du ticket, mais un vrai mot de passe Wi-Fi), remplacez le
texte de `#wifiHint` dans `index.html` pour l'indiquer, et communiquez ce
mot de passe à vos clients séparément (affiche, message).

## Publier sur GitHub Pages

1. Créez un dépôt GitHub (ex. `shaman-hotspot-app`), public.
2. Déposez les 4 fichiers de ce dossier (`index.html`, `manifest.json`,
   `icon.svg`, `sw.js`) à la racine.
3. Dans **Settings → Pages**, source = branche `main`, dossier `/root`.
4. Votre app sera disponible à une adresse du type :
   `https://<votre-nom-utilisateur>.github.io/shaman-hotspot-app/`
5. Sur un téléphone, ouvrir ce lien puis "Ajouter à l'écran d'accueil"
   (Safari) ou "Installer l'application" (Chrome Android) — l'app
   s'installera comme une vraie app, grâce au `manifest.json`.

Vous pouvez ensuite générer un QR code pointant vers cette URL (n'importe
quel générateur de QR gratuit en ligne) pour l'imprimer et l'afficher dans
votre local, et partager le lien par WhatsApp, SMS, email, réseaux sociaux.

## Limite importante à connaître

Cette app **ne remplace pas** la connexion Wi-Fi elle-même — elle
fiabilise uniquement l'étape de connexion au portail, une fois le Wi-Fi
rejoint. C'est la meilleure solution possible dans les règles imposées par
iOS et Android ; aucune app, même professionnelle, ne peut aller plus
loin sans être une app native avec des droits systèmes spéciaux
(et même dans ce cas, le client doit valider une fenêtre native de
confirmation — jamais une connexion 100% invisible).
