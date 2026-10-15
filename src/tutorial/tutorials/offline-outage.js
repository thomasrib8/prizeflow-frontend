// Tutorial: when the internet drops during the event — the banner on the phone, the switch to the box, the way back.
export default {
  id: 'offline-outage',
  icon: 'offline',
  device: 'phone',
  admin: false,
  start: '/pwa/home',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.pw-header'); await c.sleep(600); await c.point('.pw-header', 2400); },
    },
    { // 2
      async run(c) {
        c.demo('cloudLost', true);
        await c.waitFor('div[role=alert]', 20000); await c.sleep(1000);
        await c.point('div[role=alert]', 3000);
      },
    },
    { // 3
      async run(c) { await c.point('div[role=alert] a:nth-of-type(1)', 2400); await c.point('div[role=alert] a:nth-of-type(2)', 2400); },
    },
    { // 4
      async run(c) { await c.click('.pw-nav-item[href="/pwa/settings"]'); await c.sleep(1200); await c.point('.pw-switch-btn', 2800); },
    },
    { // 5
      async run(c) {
        c.demo('cloudLost', false);
        await c.waitFor(() => (document.querySelector('div[role=alert]') ? null : document.body), 20000); await c.sleep(1200);
        await c.point('.pw-header', 2400);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Quand internet tombe pendant l’événement',
      summary: 'Le bandeau orange, le passage sur le boîtier, le retour en ligne : ce que voit et fait votre commercial.',
      steps: [
        { title: 'Tout va bien', text: 'En temps normal, **Roue prête** : l’application travaille avec le cloud. Pendant ce temps, le boîtier copie la campagne en secret.' },
        { title: 'La connexion est perdue', text: 'Si le téléphone ne joint plus le cloud, un **bandeau orange** apparaît en haut de l’écran : « Connexion perdue : passez sur Spark Offline ». Il apparaît aussi si c’est la **roue** qui a perdu internet alors que le téléphone fonctionne encore.' },
        { title: 'Passer sur le boîtier', text: '**Passer à Spark Offline** ouvre l’application du boîtier (installée comme une seconde icône, **Spark Offline**). Si le Wi-Fi du lieu est tombé aussi, **Via le Wi-Fi Spark-Local** : connectez le téléphone à Spark-Local avec le QR code de la feuille imprimée.' },
        { title: 'Le bouton dans les réglages', text: 'Vous pouvez aussi **choisir vous-même** de passer en mode local depuis les **Réglages** de l’application, par exemple si la connexion est instable. En mode local, seules les actions utiles à l’événement sont disponibles.' },
        { title: 'Le retour en ligne', text: 'Quand internet revient, le bandeau disparaît. Le boîtier **renvoie tout vers le cloud** : joueurs, notes, tirages. Une barre bleue vous propose de **repasser sur l’application en ligne**. Rien n’est perdu, et aucun cadeau n’est distribué deux fois.' },
      ],
    },
    en: {
      title: 'When the internet drops during the event',
      summary: 'The orange banner, switching to the box, coming back online: what your rep sees and does.',
      steps: [
        { title: 'All is well', text: 'Normally, **Wheel ready**: the app works with the cloud. Meanwhile the box quietly copies the campaign.' },
        { title: 'The connection is lost', text: 'If the phone can no longer reach the cloud, an **orange banner** appears at the top: “Connection lost: switch to Spark Offline”. It also appears if the **wheel** lost the internet while the phone still works.' },
        { title: 'Switch to the box', text: '**Switch to Spark Offline** opens the box’s app (installed as a second icon, **Spark Offline**). If the venue Wi-Fi is down too, **Via Spark-Local Wi-Fi**: connect the phone to Spark-Local with the QR code on the printed sheet.' },
        { title: 'The button in settings', text: 'You can also **choose yourself** to switch to local mode from the app’s **Settings**, for example if the connection is unstable. In local mode only the actions useful for the event are available.' },
        { title: 'Back online', text: 'When the internet returns, the banner disappears. The box **sends everything back to the cloud**: players, notes, draws. A blue bar offers to **switch back to the online app**. Nothing is lost, and no gift is handed out twice.' },
      ],
    },
    es: {
      "title": "Cuando se cae internet durante el evento",
      "summary": "La barra naranja, el paso a la caja, la vuelta en línea: lo que ve y hace su comercial.",
      "steps": [
        {
          "title": "Todo va bien",
          "text": "Normalmente, **Rueda lista**: la aplicación trabaja con la nube. Mientras tanto, la caja copia la campaña en silencio."
        },
        {
          "title": "Se pierde la conexión",
          "text": "Si el teléfono ya no llega a la nube, aparece una **barra naranja** arriba: «Conexión perdida: pase a Spark Offline». También aparece si es la **rueda** la que perdió internet mientras el teléfono sigue funcionando."
        },
        {
          "title": "Pasar a la caja",
          "text": "**Pasar a Spark Offline** abre la aplicación de la caja (instalada como un segundo icono, **Spark Offline**). Si el Wi-Fi del lugar también se cayó, **Por el Wi-Fi Spark-Local**: conecte el teléfono a Spark-Local con el código QR de la hoja impresa."
        },
        {
          "title": "El botón en los ajustes",
          "text": "También puede **elegir usted mismo** pasar al modo local desde los **Ajustes** de la aplicación, por ejemplo si la conexión es inestable. En modo local solo están disponibles las acciones útiles para el evento."
        },
        {
          "title": "La vuelta en línea",
          "text": "Cuando vuelve internet, la barra desaparece. La caja **reenvía todo a la nube**: jugadores, notas, sorteos. Una barra azul le propone **volver a la aplicación en línea**. No se pierde nada y ningún regalo se entrega dos veces."
        }
      ]
    },
    de: {
      "title": "Wenn das Internet während der Veranstaltung ausfällt",
      "summary": "Die orange Leiste, der Wechsel auf die Box, die Rückkehr online: was Ihr Vertriebsmitarbeiter sieht und tut.",
      "steps": [
        {
          "title": "Alles in Ordnung",
          "text": "Normalerweise **Rad bereit**: die App arbeitet mit der Cloud. Währenddessen kopiert die Box still die Kampagne."
        },
        {
          "title": "Die Verbindung ist weg",
          "text": "Erreicht das Telefon die Cloud nicht mehr, erscheint oben eine **orange Leiste**: „Verbindung verloren: wechseln Sie zu Spark Offline“. Sie erscheint auch, wenn das **Rad** das Internet verloren hat, während das Telefon noch funktioniert."
        },
        {
          "title": "Auf die Box wechseln",
          "text": "**Zu Spark Offline wechseln** öffnet die App der Box (als zweites Symbol installiert, **Spark Offline**). Ist auch das WLAN des Ortes ausgefallen, **Über das WLAN Spark-Local**: verbinden Sie das Telefon mit Spark-Local über den QR-Code des gedruckten Blatts."
        },
        {
          "title": "Die Schaltfläche in den Einstellungen",
          "text": "Sie können auch **selbst entscheiden**, in den lokalen Modus zu wechseln, über die **Einstellungen** der App, zum Beispiel bei instabiler Verbindung. Im lokalen Modus sind nur die für die Veranstaltung nützlichen Aktionen verfügbar."
        },
        {
          "title": "Zurück online",
          "text": "Kehrt das Internet zurück, verschwindet die Leiste. Die Box **sendet alles an die Cloud zurück**: Spieler, Notizen, Ziehungen. Eine blaue Leiste bietet an, **zur Online-App zurückzukehren**. Nichts geht verloren und kein Geschenk wird doppelt vergeben."
        }
      ]
    },
  },
};
