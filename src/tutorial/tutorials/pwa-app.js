// Tutorial: the booth app on the phone (installed web app) — home, add a prospect, the queue, the contact card,
// the prospects list, analytics and settings.
const nav = (path) => `.pw-nav-item[href="${path}"]`;

export default {
  id: 'pwa-app',
  icon: 'phone',
  device: 'phone',
  admin: false,
  start: '/pwa/home',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.pw-header'); await c.sleep(600); await c.point('.pw-header', 2400); },
    },
    { // 2
      async run(c) { await c.point('.pw-action.primary', 2000); await c.point('.pw-nav-scan', 1800); },
    },
    { // 3
      async run(c) {
        await c.click('.pw-action:not(.primary)');
        await c.waitFor('.modal-card'); await c.sleep(900);
        await c.type(() => document.querySelectorAll('form input[required]')[0], 'Nadia'); await c.type(() => document.querySelectorAll('form input[required]')[1], 'Benali');
        await c.sleep(600);
        await c.click(() => [...document.querySelectorAll('.modal-card button')].filter((b) => /btn-secondary/.test(b.className)).pop());
        await c.sleep(500);
      },
    },
    { // 4
      async run(c) { await c.point('.pw-sheet > .pw-stack > section:first-of-type', 2600); await c.point('.pw-queue-actions', 1800); },
    },
    { // 5
      async run(c) {
        await c.click('.pw-person');
        await c.waitFor('.pc'); await c.sleep(1400);
        await c.point('.pc-main', 2400);
        await c.click('.pc-topbar .pc-only-mobile'); await c.sleep(600);
      },
    },
    { // 6
      async run(c) { await c.click(nav('/pwa/prospects')); await c.waitFor('.pw-person'); await c.sleep(500); await c.point('.pw-sheet', 2600); },
    },
    { // 7
      async run(c) { await c.click(nav('/pwa/analytics')); await c.sleep(1400); await c.point('.pw-sheet', 2800); },
    },
    { // 8
      async run(c) { await c.click(nav('/pwa/settings')); await c.sleep(1200); await c.point('.pw-sheet', 2800); },
    },
  ],
  texts: {
    fr: {
      title: 'L’application de stand sur téléphone',
      summary: 'Accueil, ajout d’un prospect, file d’attente, fiche contact, liste, statistiques et réglages : tout ce que fait votre commercial sur son mobile.',
      steps: [
        { title: 'L’écran d’accueil', text: 'En haut, la **campagne active** et l’état de la roue (**Roue prête**). L’application suit toute seule la campagne que vous activez depuis l’ordinateur.' },
        { title: 'Scanner ou ajouter', text: '**Scanner le badge** : la photo du badge d’un visiteur remplit son nom et son e-mail. Le bouton rond **Scanner**, au centre de la barre du bas, fait la même chose en un geste.' },
        { title: 'Nouveau prospect', text: '**Nouveau prospect** : saisissez un contact à la main (prénom, nom, e-mail, entreprise…), avec son consentement. Vous pouvez le mettre directement **dans la file d’attente** pour qu’il joue.' },
        { title: 'La file en direct', text: 'Qui joue en ce moment, qui attend, et le cadeau annoncé. **Passer le joueur** ou **Annuler le joueur** si besoin.' },
        { title: 'La fiche d’un contact', text: 'Touchez un joueur dans **20 derniers joueurs** : sa fiche s’ouvre en plein écran. Complétez-la **à chaud** : note (tapée ou dictée), étoiles, segment, champs. Le retour ramène à la liste.' },
        { title: 'Prospects', text: 'L’onglet **Prospects** liste tous vos contacts : recherche par nom, e-mail ou mot de la note, et filtres par cadeau, segment ou potentiel.' },
        { title: 'Analytique', text: '**Analytique** donne les chiffres de l’événement en direct : cadeaux distribués, contacts captés et qualifiés, segments.' },
        { title: 'Réglages', text: '**Réglages** : votre compte, la langue de l’application, la **connexion de la roue** et l’accès au mode hors ligne. C’est aussi ici que vous vous déconnectez.' },
      ],
    },
    en: {
      title: 'The booth app on your phone',
      summary: 'Home, adding a prospect, the queue, the contact card, the list, statistics and settings: everything your rep does on their mobile.',
      steps: [
        { title: 'The home screen', text: 'At the top, the **active campaign** and the wheel status (**Wheel ready**). The app follows by itself the campaign you activate from the computer.' },
        { title: 'Scan or add', text: '**Scan the badge**: a photo of a visitor’s badge fills in their name and e-mail. The round **Scan** button in the middle of the bottom bar does the same in one tap.' },
        { title: 'New prospect', text: '**New prospect**: type a contact by hand (first name, last name, e-mail, company…), with their consent. You can put them straight **into the queue** so they play.' },
        { title: 'The live queue', text: 'Who is playing, who is waiting, and the announced gift. **Skip the player** or **Cancel the player** if needed.' },
        { title: 'A contact’s record', text: 'Tap a player in **Last 20 players**: their record opens full screen. Complete it **on the spot**: note (typed or dictated), stars, segment, fields. Back returns to the list.' },
        { title: 'Prospects', text: 'The **Prospects** tab lists all your contacts: search by name, e-mail or a word in the note, and filter by gift, segment or potential.' },
        { title: 'Analytics', text: '**Analytics** gives the live numbers of the event: gifts handed out, contacts captured and qualified, segments.' },
        { title: 'Settings', text: '**Settings**: your account, the app language, the **wheel connection** and access to offline mode. This is also where you sign out.' },
      ],
    },
    es: {
      "title": "La aplicación de stand en el teléfono",
      "summary": "Inicio, añadir un prospecto, cola, ficha de contacto, lista, estadísticas y ajustes: todo lo que hace su comercial en el móvil.",
      "steps": [
        {
          "title": "La pantalla de inicio",
          "text": "Arriba, la **campaña activa** y el estado de la rueda (**Rueda lista**). La aplicación sigue sola la campaña que usted activa desde el ordenador."
        },
        {
          "title": "Escanear o añadir",
          "text": "**Escanear credencial**: la foto de la credencial de un visitante rellena su nombre y su email. El botón redondo **Escanear**, en el centro de la barra inferior, hace lo mismo con un toque."
        },
        {
          "title": "Nuevo prospecto",
          "text": "**Nuevo prospecto**: introduzca un contacto a mano (nombre, apellido, email, empresa…), con su consentimiento. Puede ponerlo directamente **en la cola** para que juegue."
        },
        {
          "title": "La cola en directo",
          "text": "Quién juega ahora, quién espera y el regalo anunciado. **Saltar jugador** o **Cancelar jugador** si hace falta."
        },
        {
          "title": "La ficha de un contacto",
          "text": "Toque un jugador en **Últimos 20 jugadores**: su ficha se abre a pantalla completa. Complétela **en el momento**: nota (escrita o dictada), estrellas, segmento, campos. Volver lleva a la lista."
        },
        {
          "title": "Prospectos",
          "text": "La pestaña **Prospectos** enumera todos sus contactos: búsqueda por nombre, email o una palabra de la nota, y filtros por regalo, segmento o potencial."
        },
        {
          "title": "Analítica",
          "text": "**Analítica** da las cifras del evento en directo: regalos distribuidos, contactos captados y cualificados, segmentos."
        },
        {
          "title": "Ajustes",
          "text": "**Ajustes**: su cuenta, el idioma de la aplicación, la **conexión de la rueda** y el acceso al modo sin conexión. Aquí también cierra la sesión."
        }
      ]
    },
    de: {
      "title": "Die Stand-App auf dem Telefon",
      "summary": "Start, Interessent hinzufügen, Warteschlange, Kontaktprofil, Liste, Statistiken und Einstellungen: alles, was Ihr Vertriebsmitarbeiter auf dem Handy macht.",
      "steps": [
        {
          "title": "Der Startbildschirm",
          "text": "Oben die **aktive Kampagne** und der Status des Rads (**Rad bereit**). Die App folgt von selbst der Kampagne, die Sie am Computer aktivieren."
        },
        {
          "title": "Scannen oder hinzufügen",
          "text": "**Badge scannen**: das Foto des Badges eines Besuchers füllt Name und E-Mail aus. Die runde Schaltfläche **Scannen** in der Mitte der unteren Leiste tut dasselbe mit einem Fingertipp."
        },
        {
          "title": "Neuer Interessent",
          "text": "**Neuer Interessent**: Geben Sie einen Kontakt von Hand ein (Vorname, Nachname, E-Mail, Firma …), mit seiner Einwilligung. Sie können ihn direkt **in die Warteschlange** setzen, damit er spielt."
        },
        {
          "title": "Die Live-Warteschlange",
          "text": "Wer gerade spielt, wer wartet und das angekündigte Geschenk. Bei Bedarf **Spieler überspringen** oder **Spieler abbrechen**."
        },
        {
          "title": "Das Profil eines Kontakts",
          "text": "Tippen Sie in **Letzte 20 Spieler** auf einen Spieler: sein Profil öffnet sich im Vollbild. Ergänzen Sie es **direkt vor Ort**: Notiz (getippt oder diktiert), Sterne, Segment, Felder. Zurück führt zur Liste."
        },
        {
          "title": "Interessenten",
          "text": "Der Reiter **Interessenten** listet alle Ihre Kontakte: Suche nach Name, E-Mail oder einem Wort der Notiz, und Filter nach Geschenk, Segment oder Potenzial."
        },
        {
          "title": "Analyse",
          "text": "**Analyse** liefert die Live-Zahlen der Veranstaltung: verteilte Geschenke, erfasste und qualifizierte Kontakte, Segmente."
        },
        {
          "title": "Einstellungen",
          "text": "**Einstellungen**: Ihr Konto, die Sprache der App, die **Verbindung des Rads** und der Zugang zum Offline-Modus. Hier melden Sie sich auch ab."
        }
      ]
    },
  },
};
