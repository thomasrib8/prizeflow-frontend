// Tutorial: check the wheel's connection — the "Wheel ready" label at the bottom left of the sidebar opens a diagnostic.
const row = (n) => () => document.querySelectorAll('.modal-card > div')[n] || null;

export default {
  id: 'wheel-status',
  icon: 'wheel',
  device: 'desktop',
  admin: false,
  start: '/launch',
  steps: [
    { // 1
      async run(c) { await c.waitFor('button.agent-pill'); await c.sleep(400); await c.point('.sidebar-footer', 2400); },
    },
    { // 2
      async run(c) { await c.click('button.agent-pill'); await c.waitFor('.modal-card'); await c.sleep(900); },
    },
    { // 3
      async run(c) { await c.point(row(1), 2400); },
    },
    { // 4
      async run(c) { await c.point(row(2), 2400); },
    },
    { // 5
      async run(c) { await c.point(row(3), 2200); await c.point(row(4), 2200); },
    },
    { // 6
      async run(c) { await c.point(row(5), 2400); },
    },
    { // 7
      async run(c) { await c.point(row(6), 2400); },
    },
    { // 8
      async run(c) {
        await c.click(() => [...document.querySelectorAll('.modal-card button')].pop());
        await c.sleep(600);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Vérifier que la roue est bien connectée',
      summary: 'L’étiquette en bas à gauche vous dit si tout va bien, et le diagnostic montre où chercher en cas de souci.',
      steps: [
        { title: 'L’étiquette de la roue', text: 'En bas du menu de gauche, **Roue prête** (verte) signifie que la roue est connectée et peut tourner. **Roue hors ligne** (rouge) : elle ne répond pas. L’étiquette **Boîtier offline** au-dessus indique l’état du boîtier de secours.' },
        { title: 'Ouvrir le diagnostic', text: 'Cliquez sur l’étiquette : la fenêtre **Diagnostic de connexion** s’ouvre et se met à jour toutes les 5 secondes.' },
        { title: 'Tablette ↔ Cloud', text: 'Votre écran est-il bien relié à SPARK ? On voit depuis combien de temps et la **latence** : en dessous de 150 ms tout est fluide.' },
        { title: 'Cloud ↔ Agent (Pi)', text: 'L’**agent** est le petit ordinateur (Raspberry Pi) de la roue. Ici, SPARK confirme qu’il est connecté, depuis quand, et la liste de ses **dernières déconnexions** pour repérer un problème récurrent.' },
        { title: 'Agent ↔ Roue et Wi-Fi', text: '**Agent ↔ Roue** vérifie le lien entre le Pi et la roue elle-même. **Signal Wi-Fi du Pi** donne la qualité du réseau et son nom : sous 40 %, rapprochez la roue de la borne.' },
        { title: 'Identité de la roue', text: 'Le **numéro de modèle**, le **numéro de série** et la **clé de sécurité** servent à reconnaître votre roue, par exemple lors d’un appel de dépannage.' },
        { title: 'Boîtier offline', text: 'Si vous avez un boîtier d’événement, SPARK indique s’il est **connecté et à jour** : prêt à prendre le relais si internet coupe pendant l’événement.' },
        { title: 'Fermer', text: 'Un problème ? Vérifiez d’abord l’alimentation et le Wi-Fi de la roue, puis son identité ici. Sans solution, notez ces informations pour le support.' },
      ],
    },
    en: {
      title: 'Check that the wheel is connected',
      summary: 'The label at the bottom left tells you if all is well, and the diagnostic shows where to look when it is not.',
      steps: [
        { title: 'The wheel label', text: 'At the bottom of the left menu, **Wheel ready** (green) means the wheel is connected and can spin. **Wheel offline** (red): it is not answering. The **Offline box** label above shows the state of the backup box.' },
        { title: 'Open the diagnostic', text: 'Click the label: the **Connection diagnostic** window opens and refreshes every 5 seconds.' },
        { title: 'Tablet ↔ Cloud', text: 'Is your screen properly linked to SPARK? You see for how long and the **latency**: under 150 ms everything is smooth.' },
        { title: 'Cloud ↔ Agent (Pi)', text: 'The **agent** is the wheel’s small computer (Raspberry Pi). SPARK confirms it is connected, since when, and lists its **latest disconnections** to spot a recurring problem.' },
        { title: 'Agent ↔ Wheel and Wi-Fi', text: '**Agent ↔ Wheel** checks the link between the Pi and the wheel itself. **Pi Wi-Fi signal** gives the network quality and name: under 40 %, bring the wheel closer to the access point.' },
        { title: 'Wheel identity', text: 'The **model number**, **serial number** and **security key** identify your wheel, for example during a support call.' },
        { title: 'Offline box', text: 'If you have an event box, SPARK shows whether it is **connected and up to date**: ready to take over if the internet drops during the event.' },
        { title: 'Close', text: 'A problem? Check the wheel’s power and Wi-Fi first, then its identity here. If that does not help, note this information for support.' },
      ],
    },
    es: {
      "title": "Comprobar que la rueda está bien conectada",
      "summary": "La etiqueta de abajo a la izquierda le dice si todo va bien, y el diagnóstico muestra dónde buscar si hay un problema.",
      "steps": [
        {
          "title": "La etiqueta de la rueda",
          "text": "Abajo en el menú de la izquierda, **Rueda lista** (verde) significa que la rueda está conectada y puede girar. **Rueda desconectada** (roja): no responde. La etiqueta **Caja sin conexión** de encima indica el estado de la caja de respaldo."
        },
        {
          "title": "Abrir el diagnóstico",
          "text": "Haga clic en la etiqueta: se abre la ventana **Diagnóstico de conexión** y se actualiza cada 5 segundos."
        },
        {
          "title": "Tableta ↔ Nube",
          "text": "¿Está su pantalla bien conectada a SPARK? Se ve desde cuándo y la **latencia**: por debajo de 150 ms todo va fluido."
        },
        {
          "title": "Nube ↔ Agente (Pi)",
          "text": "El **agente** es el pequeño ordenador (Raspberry Pi) de la rueda. SPARK confirma aquí que está conectado, desde cuándo, y la lista de sus **últimas desconexiones** para detectar un problema recurrente."
        },
        {
          "title": "Agente ↔ Rueda y Wi-Fi",
          "text": "**Agente ↔ Rueda** comprueba el enlace entre la Pi y la propia rueda. **Señal Wi-Fi de la Pi** da la calidad de la red y su nombre: por debajo del 40 %, acerque la rueda al punto de acceso."
        },
        {
          "title": "Identidad de la rueda",
          "text": "El **número de modelo**, el **número de serie** y la **clave de seguridad** sirven para reconocer su rueda, por ejemplo durante una llamada de asistencia."
        },
        {
          "title": "Caja sin conexión",
          "text": "Si tiene una caja de evento, SPARK indica si está **conectada y al día**: lista para tomar el relevo si internet se corta durante el evento."
        },
        {
          "title": "Cerrar",
          "text": "¿Un problema? Compruebe primero la alimentación y el Wi-Fi de la rueda, y luego su identidad aquí. Si no hay solución, anote esta información para el soporte."
        }
      ]
    },
    de: {
      "title": "Prüfen, ob das Rad richtig verbunden ist",
      "summary": "Das Etikett unten links zeigt Ihnen, ob alles in Ordnung ist, und die Diagnose zeigt, wo Sie bei einem Problem suchen müssen.",
      "steps": [
        {
          "title": "Das Etikett des Rads",
          "text": "Unten im linken Menü bedeutet **Rad bereit** (grün), dass das Rad verbunden ist und sich drehen kann. **Rad offline** (rot): es antwortet nicht. Das Etikett **Offline-Box** darüber zeigt den Zustand der Ersatz-Box."
        },
        {
          "title": "Die Diagnose öffnen",
          "text": "Klicken Sie auf das Etikett: das Fenster **Verbindungsdiagnose** öffnet sich und aktualisiert sich alle 5 Sekunden."
        },
        {
          "title": "Tablet ↔ Cloud",
          "text": "Ist Ihr Bildschirm richtig mit SPARK verbunden? Sie sehen, seit wann, und die **Latenz**: unter 150 ms läuft alles flüssig."
        },
        {
          "title": "Cloud ↔ Agent (Pi)",
          "text": "Der **Agent** ist der kleine Computer (Raspberry Pi) des Rads. SPARK bestätigt hier, dass er verbunden ist, seit wann, und listet seine **letzten Trennungen** auf, um ein wiederkehrendes Problem zu erkennen."
        },
        {
          "title": "Agent ↔ Rad und WLAN",
          "text": "**Agent ↔ Rad** prüft die Verbindung zwischen dem Pi und dem Rad selbst. **WLAN-Signal des Pi** gibt die Netzqualität und den Netznamen an: unter 40 % das Rad näher an den Zugangspunkt bringen."
        },
        {
          "title": "Identität des Rads",
          "text": "Die **Modellnummer**, die **Seriennummer** und der **Sicherheitsschlüssel** dienen dazu, Ihr Rad zu erkennen, zum Beispiel bei einem Support-Anruf."
        },
        {
          "title": "Offline-Box",
          "text": "Wenn Sie eine Veranstaltungs-Box haben, zeigt SPARK, ob sie **verbunden und aktuell** ist: bereit zu übernehmen, falls das Internet während der Veranstaltung ausfällt."
        },
        {
          "title": "Schließen",
          "text": "Ein Problem? Prüfen Sie zuerst Stromversorgung und WLAN des Rads, dann hier seine Identität. Hilft das nicht, notieren Sie diese Angaben für den Support."
        }
      ]
    },
  },
};
