// Tutorial (administrators): commission a rental with the "Set up" assistant — wheel, Spark-Local Wi-Fi, wheel block, box code, checks.
const wizBtn = (last) => () => { const b = document.querySelectorAll('.sw-foot button'); return b.length ? (last ? b[b.length - 1] : b[0]) : null; };

export default {
  id: 'setup-wizard',
  icon: 'wrench',
  device: 'desktop',
  admin: true,
  start: '/users/usr_c3',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.page-header .btn-primary'); await c.sleep(600); await c.click('.page-header .btn-primary'); await c.waitFor('.sw-card'); await c.sleep(900); await c.point('.sw-steps', 2400); },
    },
    { // 2
      async run(c) {
        await c.click(() => [...document.querySelectorAll('.sw-row')].find((r) => r.innerText.includes('PF260000155')));
        await c.sleep(500); await c.point('.sw-body', 1800);
        await c.click(wizBtn(true));
        await c.waitFor(() => document.querySelector('.sw-body input[type=password]'), 8000); await c.sleep(600);
      },
    },
    { // 3
      async run(c) { await c.point('.sw-body input[type=password]', 1800); await c.point('.sw-wifi', 2600); await c.click(wizBtn(true)); await c.waitFor('.sw-pre, .sw-code', 8000); await c.sleep(600); },
    },
    { // 4
      async run(c) {
        await c.click('.sw-body button.btn-secondary'); await c.waitFor('.sw-pre', 6000); await c.sleep(900);
        await c.point('.sw-code', 2400);
        c.demo('wheelLive', 'on');
        await c.waitFor('.sw-status.ok', 14000); await c.sleep(1200);
        await c.click(wizBtn(true)); await c.waitFor('.sw-body button', 6000); await c.sleep(500);
      },
    },
    { // 5
      async run(c) {
        await c.click('.sw-body button.btn-primary, .sw-body button.btn-secondary');
        await c.waitFor('.sw-codebig', 8000); await c.sleep(900); await c.point('.sw-codebig', 2600);
        await c.point('.sw-ol', 2600);
        c.demo('box', 'delivered'); await c.sleep(5200);
        c.demo('box', 'activated'); await c.waitFor('.sw-tag.ok:nth-of-type(3)', 12000); await c.sleep(1200);
        await c.point('.sw-timeline', 1800);
        await c.click(wizBtn(true)); await c.waitFor('.sw-check', 6000); await c.sleep(600);
      },
    },
    { // 6
      async run(c) { await c.point('.sw-body', 2600); await c.point('#handover-sheet', 3000); await c.click(wizBtn(true)); await c.sleep(600); },
    },
  ],
  texts: {
    fr: {
      title: 'Mettre en service une location avec l’assistant',
      summary: 'Roue, Wi-Fi Spark-Local, configuration de la roue, activation du boîtier et fiche de remise : un parcours guidé en 5 étapes.',
      steps: [
        { title: 'Lancer l’assistant', text: 'Sur la **fiche du client**, **Mettre en service** ouvre l’assistant. Vous pouvez le fermer et le rouvrir à tout moment : il **reprend à la bonne étape** d’après l’état réel de la roue et du boîtier.' },
        { title: '1 · Choisir la roue', text: 'Prenez une **roue du parc** (celles du dépôt sont proposées ; les roues louées sont masquées par défaut) ou créez une **nouvelle roue**. Continuer l’attribue au client.' },
        { title: '2 · Le Wi-Fi Spark-Local', text: 'Un **mot de passe propre à ce client** est proposé (modifiable, à confirmer, 8 à 63 caractères). Il sera celui du Wi-Fi de secours du boîtier et du QR code imprimé.' },
        { title: '3 · Configurer la roue', text: '**Copier le bloc**, puis le coller dans le Raspberry Pi avec la commande affichée : jeton, identité et réseau sont réglés d’un coup, sans rien taper à la main. Le voyant passe au vert quand la roue se connecte avec la **bonne identité**.' },
        { title: '4 · Activer le boîtier', text: '**Créer un code d’activation** (valable 24 h, affiché une seule fois). Sur place : câble réseau, page d’activation du boîtier, saisie du code. Le suivi passe de **Code créé** à **Saisi** puis **Boîtier activé**.' },
        { title: '5 · Vérifications et fiche', text: 'La liste de contrôle confirme que tout fonctionne. La **fiche de remise** à imprimer réunit la roue, le boîtier, le Wi-Fi avec son mot de passe, les deux QR codes et votre numéro de dépannage. **Terminer** clôt la mise en service.' },
      ],
    },
    en: {
      title: 'Set up a rental with the assistant',
      summary: 'Wheel, Spark-Local Wi-Fi, wheel configuration, box activation and hand-over sheet: a guided 5-step journey.',
      steps: [
        { title: 'Start the assistant', text: 'On the **client’s page**, **Set up for rental** opens the assistant. You can close and reopen it at any time: it **resumes at the right step** from the real state of the wheel and the box.' },
        { title: '1 · Choose the wheel', text: 'Take a **wheel from the park** (those at the depot are offered; rented wheels are hidden by default) or create a **new wheel**. Continue assigns it to the client.' },
        { title: '2 · The Spark-Local Wi-Fi', text: 'A **password specific to this client** is suggested (editable, to confirm, 8 to 63 characters). It will be the box’s backup Wi-Fi password and the one on the printed QR code.' },
        { title: '3 · Set up the wheel', text: '**Copy the block**, then paste it in the Raspberry Pi with the command shown: token, identity and network are set at once, with nothing typed by hand. The light turns green when the wheel connects with the **right identity**.' },
        { title: '4 · Activate the box', text: '**Create an activation code** (valid 24 h, shown once). On site: network cable, the box’s activation page, enter the code. The tracker goes from **Code created** to **Entered** then **Box activated**.' },
        { title: '5 · Checks and sheet', text: 'The checklist confirms everything works. The printable **hand-over sheet** gathers the wheel, the box, the Wi-Fi with its password, the two QR codes and your support number. **Finish** closes the set-up.' },
      ],
    },
    es: {
      "title": "Poner en servicio un alquiler con el asistente",
      "summary": "Rueda, Wi-Fi Spark-Local, configuración de la rueda, activación de la caja y hoja de entrega: un recorrido guiado en 5 pasos.",
      "steps": [
        {
          "title": "Iniciar el asistente",
          "text": "En la **ficha del cliente**, **Puesta en servicio** abre el asistente. Puede cerrarlo y reabrirlo en cualquier momento: **retoma en el paso correcto** según el estado real de la rueda y de la caja."
        },
        {
          "title": "1 · Elegir la rueda",
          "text": "Tome una **rueda del parque** (se ofrecen las del almacén; las ruedas alquiladas están ocultas por defecto) o cree una **rueda nueva**. Continuar la asigna al cliente."
        },
        {
          "title": "2 · El Wi-Fi Spark-Local",
          "text": "Se propone una **contraseña propia de este cliente** (editable, a confirmar, de 8 a 63 caracteres). Será la del Wi-Fi de respaldo de la caja y la del código QR impreso."
        },
        {
          "title": "3 · Configurar la rueda",
          "text": "**Copiar el bloque** y pegarlo en la Raspberry Pi con el comando mostrado: token, identidad y red se configuran de una vez, sin escribir nada a mano. El indicador se pone verde cuando la rueda se conecta con la **identidad correcta**."
        },
        {
          "title": "4 · Activar la caja",
          "text": "**Crear un código de activación** (válido 24 h, mostrado una sola vez). In situ: cable de red, página de activación de la caja, introducir el código. El seguimiento pasa de **Código creado** a **Introducido** y luego **Caja activada**."
        },
        {
          "title": "5 · Comprobaciones y hoja",
          "text": "La lista de comprobación confirma que todo funciona. La **hoja de entrega** imprimible reúne la rueda, la caja, el Wi-Fi con su contraseña, los dos códigos QR y su número de asistencia. **Terminar** cierra la puesta en servicio."
        }
      ]
    },
    de: {
      "title": "Eine Miete mit dem Assistenten in Betrieb nehmen",
      "summary": "Rad, WLAN Spark-Local, Radkonfiguration, Box-Aktivierung und Übergabeblatt: eine geführte Strecke in 5 Schritten.",
      "steps": [
        {
          "title": "Den Assistenten starten",
          "text": "Auf der **Kundenseite** öffnet **In Betrieb nehmen** den Assistenten. Sie können ihn jederzeit schließen und wieder öffnen: er **setzt am richtigen Schritt fort**, anhand des tatsächlichen Zustands von Rad und Box."
        },
        {
          "title": "1 · Das Rad wählen",
          "text": "Nehmen Sie ein **Rad aus dem Park** (die im Lager werden angeboten; vermietete Räder sind standardmäßig ausgeblendet) oder legen Sie ein **neues Rad** an. Weiter weist es dem Kunden zu."
        },
        {
          "title": "2 · Das WLAN Spark-Local",
          "text": "Es wird ein **Passwort nur für diesen Kunden** vorgeschlagen (änderbar, zu bestätigen, 8 bis 63 Zeichen). Es wird das Passwort des Ersatz-WLANs der Box und des gedruckten QR-Codes."
        },
        {
          "title": "3 · Das Rad einrichten",
          "text": "**Block kopieren** und im Raspberry Pi mit dem angezeigten Befehl einfügen: Token, Identität und Netzwerk werden auf einmal eingestellt, ohne etwas von Hand zu tippen. Die Anzeige wird grün, wenn sich das Rad mit der **richtigen Identität** verbindet."
        },
        {
          "title": "4 · Die Box aktivieren",
          "text": "**Aktivierungscode erstellen** (24 Std. gültig, nur einmal angezeigt). Vor Ort: Netzwerkkabel, Aktivierungsseite der Box, Code eingeben. Die Anzeige geht von **Code erstellt** über **Eingegeben** zu **Box aktiviert**."
        },
        {
          "title": "5 · Prüfungen und Blatt",
          "text": "Die Checkliste bestätigt, dass alles funktioniert. Das druckbare **Übergabeblatt** enthält Rad, Box, WLAN mit Passwort, die beiden QR-Codes und Ihre Support-Nummer. **Fertig** schließt die Inbetriebnahme ab."
        }
      ]
    },
  },
};
