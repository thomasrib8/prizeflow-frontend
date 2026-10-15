// Tutorial: the offline event box — what it is, the Spark-Local Wi-Fi sheet, the kiosk access code, the e-mail alert,
// and the offline kiosk button on the Launch page.
const modeTab = () => document.querySelectorAll('.tabs')[0]?.querySelectorAll('.tab')[6] || null;

export default {
  id: 'offline-setup',
  icon: 'box',
  device: 'desktop',
  admin: false,
  start: '/settings',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.sidebar-footer'); await c.sleep(500); await c.point('.sidebar-footer > *:first-child', 2600); },
    },
    { // 2
      async run(c) { await c.click(modeTab); await c.waitFor('main .card'); await c.sleep(900); await c.point('main .card', 2800); },
    },
    { // 3
      async run(c) {
        await c.click('main .card button.btn-secondary');
        await c.waitFor('.wq-sheet'); await c.sleep(900);
        await c.point('.wq-sheet', 3000);
        await c.click(() => document.querySelector('.wq-actions button'));
        await c.sleep(500);
      },
    },
    { // 4
      async run(c) { await c.point('main .card .field', 2400); },
    },
    { // 5
      async run(c) { await c.point('main .card .field + div + p, main .card:last-of-type', 2600); },
    },
    { // 6
      async run(c) { await c.go('/launch', 900); await c.waitFor('.launch-header a.btn'); await c.point('.launch-header a.btn', 2800); },
    },
  ],
  texts: {
    fr: {
      title: 'Le boîtier hors ligne : travailler sans internet',
      summary: 'Wi-Fi de secours, code du kiosque, alerte e-mail : tout ce qu’il faut savoir pour que l’événement continue si la connexion tombe.',
      steps: [
        { title: 'Le boîtier d’événement', text: 'Le **boîtier** est un petit serveur que vous apportez sur le stand. Il **copie en permanence** votre campagne. Si internet tombe, la roue et vos commerciaux passent sur lui : **le jeu ne s’arrête pas**. L’étiquette **Boîtier offline** (verte) confirme qu’il est connecté et à jour.' },
        { title: 'Le mode local', text: 'L’onglet **Mode local** des paramètres réunit tout ce qui concerne le boîtier : son **réseau Wi-Fi de secours Spark-Local** et ses adresses.' },
        { title: 'Le QR code Wi-Fi à imprimer', text: '**QR code Wi-Fi à imprimer** : une page avec **deux QR codes** (rejoindre le Wi-Fi Spark-Local, puis ouvrir la page de réglage) et le mot de passe en clair, à afficher sur le stand. Ce mot de passe est choisi à la mise en service du boîtier.' },
        { title: 'Le code d’accès du kiosque', text: 'Le **code d’accès** protège l’application du boîtier : vos commerciaux le saisissent au premier passage en mode local. Choisissez-en un **solide** (8 caractères minimum, pas que des chiffres).' },
        { title: 'L’alerte par e-mail', text: 'Si la roue **perd le cloud pendant une campagne active**, SPARK vous envoie un **e-mail d’alerte** : vous le réglez ici, avec un délai minimum entre deux alertes pour ne pas être inondé.' },
        { title: 'Le kiosque offline', text: 'Sur la page **Lancer**, le bouton **Kiosque offline** ouvre l’écran des invités servi **par le boîtier** : il continue à fonctionner sans internet, sur le Wi-Fi du lieu ou sur Spark-Local.' },
      ],
    },
    en: {
      title: 'The offline box: working without internet',
      summary: 'Backup Wi-Fi, kiosk code, e-mail alert: everything to know so the event carries on if the connection drops.',
      steps: [
        { title: 'The event box', text: 'The **box** is a small server you bring to the booth. It **constantly copies** your campaign. If the internet drops, the wheel and your reps switch to it: **the game does not stop**. The **Offline box** label (green) confirms it is connected and up to date.' },
        { title: 'Local mode', text: 'The **Local mode** tab of the settings gathers everything about the box: its **Spark-Local backup Wi-Fi** and its addresses.' },
        { title: 'The Wi-Fi QR code to print', text: '**Wi-Fi QR code to print**: a page with **two QR codes** (join the Spark-Local Wi-Fi, then open the setup page) and the password in clear, to display at the booth. This password is chosen when the box is set up.' },
        { title: 'The kiosk access code', text: 'The **access code** protects the box’s app: your reps enter it the first time they use local mode. Choose a **strong** one (8 characters minimum, not only digits).' },
        { title: 'The e-mail alert', text: 'If the wheel **loses the cloud during an active campaign**, SPARK sends you an **alert e-mail**: you set it here, with a minimum delay between two alerts so you are not flooded.' },
        { title: 'The offline kiosk', text: 'On the **Launch** page, the **Offline kiosk** button opens the guest screen served **by the box**: it keeps working without internet, on the venue’s Wi-Fi or on Spark-Local.' },
      ],
    },
    es: {
      "title": "La caja sin conexión: trabajar sin internet",
      "summary": "Wi-Fi de respaldo, código del kiosco, alerta por email: todo lo que hay que saber para que el evento continúe si se cae la conexión.",
      "steps": [
        {
          "title": "La caja del evento",
          "text": "La **caja** es un pequeño servidor que lleva al stand. **Copia permanentemente** su campaña. Si se cae internet, la rueda y sus comerciales pasan a ella: **el juego no se detiene**. La etiqueta **Caja sin conexión** (verde) confirma que está conectada y al día."
        },
        {
          "title": "El modo local",
          "text": "La pestaña **Modo local** de los ajustes reúne todo lo relativo a la caja: su **red Wi-Fi de respaldo Spark-Local** y sus direcciones."
        },
        {
          "title": "El código QR del Wi-Fi para imprimir",
          "text": "**Código QR del Wi-Fi para imprimir**: una página con **dos códigos QR** (unirse al Wi-Fi Spark-Local y luego abrir la página de ajuste) y la contraseña en claro, para exponer en el stand. Esta contraseña se elige al poner en servicio la caja."
        },
        {
          "title": "El código de acceso del kiosco",
          "text": "El **código de acceso** protege la aplicación de la caja: sus comerciales lo introducen la primera vez que usan el modo local. Elija uno **robusto** (8 caracteres como mínimo, no solo cifras)."
        },
        {
          "title": "La alerta por email",
          "text": "Si la rueda **pierde la nube durante una campaña activa**, SPARK le envía un **email de alerta**: lo configura aquí, con un plazo mínimo entre dos alertas para no verse inundado."
        },
        {
          "title": "El kiosco sin conexión",
          "text": "En la página **Lanzar**, el botón **Kiosco sin conexión** abre la pantalla de los invitados servida **por la caja**: sigue funcionando sin internet, con el Wi-Fi del lugar o con Spark-Local."
        }
      ]
    },
    de: {
      "title": "Die Offline-Box: ohne Internet arbeiten",
      "summary": "Ersatz-WLAN, Kiosk-Code, E-Mail-Warnung: alles, was man wissen muss, damit die Veranstaltung weiterläuft, wenn die Verbindung ausfällt.",
      "steps": [
        {
          "title": "Die Veranstaltungs-Box",
          "text": "Die **Box** ist ein kleiner Server, den Sie zum Stand mitbringen. Sie **kopiert ständig** Ihre Kampagne. Fällt das Internet aus, wechseln das Rad und Ihre Vertriebsmitarbeiter auf sie: **das Spiel stoppt nicht**. Das Etikett **Offline-Box** (grün) bestätigt, dass sie verbunden und aktuell ist."
        },
        {
          "title": "Der lokale Modus",
          "text": "Der Reiter **Lokaler Modus** der Einstellungen vereint alles zur Box: ihr **Ersatz-WLAN Spark-Local** und ihre Adressen."
        },
        {
          "title": "Der WLAN-QR-Code zum Drucken",
          "text": "**WLAN-QR-Code zum Drucken**: eine Seite mit **zwei QR-Codes** (dem WLAN Spark-Local beitreten, dann die Einrichtungsseite öffnen) und dem Passwort im Klartext, zum Aushängen am Stand. Dieses Passwort wird bei der Inbetriebnahme der Box gewählt."
        },
        {
          "title": "Der Zugangscode des Kiosks",
          "text": "Der **Zugangscode** schützt die App der Box: Ihre Vertriebsmitarbeiter geben ihn bei der ersten Nutzung des lokalen Modus ein. Wählen Sie einen **starken** (mindestens 8 Zeichen, nicht nur Ziffern)."
        },
        {
          "title": "Die E-Mail-Warnung",
          "text": "Verliert das Rad **die Cloud während einer aktiven Kampagne**, sendet SPARK Ihnen eine **Warn-E-Mail**: Sie stellen sie hier ein, mit einer Mindestpause zwischen zwei Warnungen, damit Sie nicht überflutet werden."
        },
        {
          "title": "Der Offline-Kiosk",
          "text": "Auf der Seite **Start** öffnet die Schaltfläche **Offline-Kiosk** den Gästebildschirm, bereitgestellt **von der Box**: er funktioniert ohne Internet weiter, im WLAN des Ortes oder über Spark-Local."
        }
      ]
    },
  },
};
