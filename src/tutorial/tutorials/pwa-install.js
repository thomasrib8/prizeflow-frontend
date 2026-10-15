// Tutorial: install the SPARK app on a phone (it is a web app: no store, added to the home screen).
export default {
  id: 'pwa-install',
  icon: 'download',
  device: 'desktop',
  admin: false,
  start: '/',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.page-header'); await c.sleep(600); await c.point('.page-header button.btn-secondary', 2400); },
    },
    { // 2
      async run(c) { await c.click('.page-header button.btn-secondary'); await c.waitFor('.modal-card img'); await c.sleep(900); await c.point('.modal-card img', 2600); },
    },
    { // 3
      async run(c) { await c.point(() => document.querySelectorAll('.modal-card ol')[0]?.parentElement, 3600); },
    },
    { // 4
      async run(c) { await c.point(() => document.querySelectorAll('.modal-card ol')[1]?.parentElement, 3600); },
    },
    { // 5
      async run(c) { await c.click(() => [...document.querySelectorAll('.modal-card button')].pop()); await c.sleep(500); },
    },
  ],
  texts: {
    fr: {
      title: 'Installer l’application SPARK sur le téléphone',
      summary: 'Un QR code, deux gestes : l’application de stand s’ajoute à l’écran d’accueil de vos commerciaux, sans passer par un magasin d’applications.',
      steps: [
        { title: 'Le bouton Télécharger l’app', text: 'Sur le **tableau de bord**, **Télécharger l’app** ouvre la page d’installation. L’application SPARK est une **application web** : rien à chercher dans l’App Store ni Google Play.' },
        { title: 'Le QR code', text: 'Faites **scanner ce QR code** par le téléphone de votre commercial (appareil photo), ou envoyez-lui le lien. La page de l’application s’ouvre dans le navigateur.' },
        { title: 'Sur iPhone', text: 'Ouvrez le lien dans **Safari**, touchez le bouton **Partager**, choisissez **Sur l’écran d’accueil** puis **Ajouter**. L’icône SPARK apparaît comme une vraie application, en plein écran.' },
        { title: 'Sur Android', text: 'Ouvrez le lien dans **Chrome**, touchez le menu **⋮** puis **Installer l’application** (ou **Ajouter à l’écran d’accueil**) et confirmez.' },
        { title: 'Et ensuite', text: 'Le commercial se connecte avec son compte et retrouve la **campagne active**, la file d’attente, ses contacts et peut **ajouter un prospect** ou **scanner un badge**. Voir le tutoriel sur l’application de stand.' },
      ],
    },
    en: {
      title: 'Install the SPARK app on a phone',
      summary: 'One QR code, two taps: the booth app is added to your reps’ home screen, with no app store involved.',
      steps: [
        { title: 'The Download the app button', text: 'On the **dashboard**, **Download the app** opens the installation page. The SPARK app is a **web app**: nothing to look for in the App Store or Google Play.' },
        { title: 'The QR code', text: 'Have your rep’s phone **scan this QR code** (camera), or send them the link. The app page opens in the browser.' },
        { title: 'On iPhone', text: 'Open the link in **Safari**, tap the **Share** button, choose **Add to Home Screen** then **Add**. The SPARK icon appears like a real app, full screen.' },
        { title: 'On Android', text: 'Open the link in **Chrome**, tap the **⋮** menu then **Install app** (or **Add to Home screen**) and confirm.' },
        { title: 'What next', text: 'The rep signs in with their account and finds the **active campaign**, the queue and their contacts, and can **add a prospect** or **scan a badge**. See the tutorial on the booth app.' },
      ],
    },
    es: {
      "title": "Instalar la aplicación SPARK en el teléfono",
      "summary": "Un código QR, dos toques: la aplicación de stand se añade a la pantalla de inicio de sus comerciales, sin pasar por una tienda de aplicaciones.",
      "steps": [
        {
          "title": "El botón Descargar la app",
          "text": "En el **panel**, **Descargar la app** abre la página de instalación. La aplicación SPARK es una **aplicación web**: nada que buscar en la App Store ni en Google Play."
        },
        {
          "title": "El código QR",
          "text": "Haga que el teléfono de su comercial **escanee este código QR** (cámara), o envíele el enlace. La página de la aplicación se abre en el navegador."
        },
        {
          "title": "En iPhone",
          "text": "Abra el enlace en **Safari**, toque el botón **Compartir**, elija **Añadir a pantalla de inicio** y luego **Añadir**. El icono de SPARK aparece como una aplicación de verdad, a pantalla completa."
        },
        {
          "title": "En Android",
          "text": "Abra el enlace en **Chrome**, toque el menú **⋮** y luego **Instalar aplicación** (o **Añadir a pantalla de inicio**) y confirme."
        },
        {
          "title": "Y después",
          "text": "El comercial inicia sesión con su cuenta y encuentra la **campaña activa**, la cola y sus contactos, y puede **añadir un prospecto** o **escanear una credencial**. Vea el tutorial sobre la aplicación de stand."
        }
      ]
    },
    de: {
      "title": "Die SPARK-App auf dem Telefon installieren",
      "summary": "Ein QR-Code, zwei Fingertipps: die Stand-App wird dem Startbildschirm Ihrer Vertriebsmitarbeiter hinzugefügt, ohne App-Store.",
      "steps": [
        {
          "title": "Die Schaltfläche App herunterladen",
          "text": "In der **Übersicht** öffnet **App herunterladen** die Installationsseite. Die SPARK-App ist eine **Web-App**: im App Store oder bei Google Play gibt es nichts zu suchen."
        },
        {
          "title": "Der QR-Code",
          "text": "Lassen Sie das Telefon Ihres Vertriebsmitarbeiters **diesen QR-Code scannen** (Kamera), oder senden Sie ihm den Link. Die App-Seite öffnet sich im Browser."
        },
        {
          "title": "Auf dem iPhone",
          "text": "Öffnen Sie den Link in **Safari**, tippen Sie auf **Teilen**, wählen Sie **Zum Home-Bildschirm** und dann **Hinzufügen**. Das SPARK-Symbol erscheint wie eine echte App, im Vollbild."
        },
        {
          "title": "Auf Android",
          "text": "Öffnen Sie den Link in **Chrome**, tippen Sie auf das Menü **⋮**, dann auf **App installieren** (oder **Zum Startbildschirm hinzufügen**) und bestätigen Sie."
        },
        {
          "title": "Und danach",
          "text": "Der Vertriebsmitarbeiter meldet sich mit seinem Konto an und findet die **aktive Kampagne**, die Warteschlange und seine Kontakte, und kann **einen Interessenten hinzufügen** oder **ein Badge scannen**. Siehe die Anleitung zur Stand-App."
        }
      ]
    },
  },
};
