// Tutorial: the Launch page — the guest QR code, the kiosk (spin on this screen), adding a contact by hand or by badge
// photo, the live queue, and the last players.
const inp = (k) => () => document.querySelectorAll('form input[required]')[k] || null;
const headerBtn = (first) => () => {
  const bs = document.querySelectorAll('.launch-header > div:last-child > button');
  return bs.length ? (first ? bs[0] : bs[bs.length - 1]) : null;
};

export default {
  id: 'launch',
  icon: 'launch',
  device: 'desktop',
  admin: false,
  start: '/launch',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.qr-layout img'); await c.sleep(500); await c.point('.launch-header', 2400); },
    },
    { // 2
      async run(c) { await c.point('.qr-layout > *:first-child img', 2600); },
    },
    { // 3
      async run(c) { await c.point('.qr-layout > *:first-child div[style*="justify-content: center"]', 2000); },
    },
    { // 4  kiosk: the form on this screen
      async run(c) {
        await c.click(headerBtn(false));
        await c.waitFor(inp(0)); await c.sleep(700);
        await c.type(inp(0), 'Camille'); await c.type(inp(1), 'Dubois'); await c.type(inp(2), 'camille.dubois@exemple.fr');
        await c.click('form input[type=radio]');
        await c.click('form input[type=checkbox]');
        await c.point('form button[type=submit]', 900);
      },
    },
    { // 5  the queue on the kiosk, then the result
      async run(c) {
        await c.click('form button[type=submit]');
        await c.waitFor(() => document.body.innerText.includes('#3')); await c.sleep(2200);
        c.demo('guest', 'waiting0'); await c.sleep(1800);
        c.demo('guest', 'active'); await c.sleep(1800);
        c.demo('guest', 'spinning'); await c.sleep(2000);
        c.demo('guest', 'done'); await c.sleep(3000);
        await c.click('div[style*="width: 120px"][style*="bottom: 0"] button');
        await c.waitFor('.qr-layout'); await c.sleep(600);
      },
    },
    { // 6  the offline kiosk
      async run(c) { await c.point('.launch-header a.btn', 2400); },
    },
    { // 7  add a contact: scan a badge or type
      async run(c) {
        await c.click(headerBtn(true));
        await c.waitFor('.modal-card'); await c.sleep(700);
        await c.point('.modal-card > div[style*="dashed"]', 2200);
        await c.type(inp(0), 'Nadia'); await c.type(inp(1), 'Benali');
        await c.sleep(500);
        await c.click(() => [...document.querySelectorAll('.modal-card button')].filter((b) => /btn-secondary/.test(b.className)).pop());
        await c.sleep(500);
      },
    },
    { // 8  the live queue
      async run(c) {
        await c.point('.qr-layout > *:nth-child(2)', 2400);
        await c.point('.qr-layout > *:nth-child(2) button', 1800);
      },
    },
    { // 9  the last players, and a prospect card
      async run(c) {
        await c.point('.lc-list', 2200);
        await c.click('.lc-list .crm-row');
        await c.waitFor('.pc'); await c.sleep(1400);
        await c.point('.pc', 1800);
        await c.click('.pc-topbar .pc-only-desktop');
        await c.sleep(500);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Lancer l’événement : QR code, kiosque et file d’attente',
      summary: 'Faire jouer vos invités : par QR code, sur l’écran du stand, ou en ajoutant un contact à la main ou par photo de badge.',
      steps: [
        { title: 'La page Lancer', text: 'C’est le poste de pilotage de l’événement. En haut, **Roue prête** confirme que la roue est connectée ; à côté, les boutons pour faire jouer quelqu’un. La page suit la campagne **active**.' },
        { title: 'Le QR code invité', text: 'Vos invités **scannent ce QR code** avec leur téléphone : ils arrivent sur le formulaire de la campagne, sans rien installer. Chaque campagne a son propre QR code.' },
        { title: 'L’imprimer ou l’afficher', text: '**Télécharger en PNG** pour l’afficher à l’écran, **Télécharger en PDF** prêt à imprimer pour votre stand ou vos flyers.' },
        { title: 'Faire jouer sur cet écran', text: '**Tourner la roue** ouvre le formulaire en plein écran sur cette tablette ou cet ordinateur : idéal pour un invité sans téléphone. Il remplit son prénom, son nom, son e-mail et accepte la participation.' },
        { title: 'La file d’attente', text: 'L’invité est ajouté à la file : sa **position** s’affiche, puis c’est son tour, la roue tourne et le résultat s’affiche. Le cadeau lui est envoyé par e-mail. L’écran revient seul au formulaire pour le suivant ; le coin en bas à droite permet de quitter.' },
        { title: 'Le kiosque offline', text: '**Kiosque offline** ouvre le même écran servi par le boîtier de l’événement : il continue à fonctionner si la connexion internet est coupée.' },
        { title: 'Ajouter un contact à la main ou par photo', text: '**Nouveau prospect** ajoute quelqu’un qui n’a pas scanné le QR code. Prenez une **photo de son badge** : SPARK lit le nom et l’e-mail. Sinon, saisissez-les. Vous pouvez aussi l’ajouter directement à la file d’attente.' },
        { title: 'Suivre la file en direct', text: 'Le panneau **File en direct** montre qui joue, qui attend et les derniers résultats. Si besoin, **Passer** ou **Annuler** le joueur en cours.' },
        { title: 'Les 20 derniers joueurs', text: 'La liste des **20 derniers joueurs** montre leur cadeau, leur segment, leur potentiel et leur note. **Cliquez un nom** pour ouvrir sa fiche et la compléter à chaud.' },
      ],
    },
    en: {
      title: 'Run the event: QR code, kiosk and queue',
      summary: 'Let your guests play: by QR code, on the booth screen, or by adding a contact by hand or from a badge photo.',
      steps: [
        { title: 'The Launch page', text: 'This is the control room of the event. At the top, **Wheel ready** confirms the wheel is connected; next to it, the buttons to let someone play. The page follows the **active** campaign.' },
        { title: 'The guest QR code', text: 'Your guests **scan this QR code** with their phone: they land on the campaign form, with nothing to install. Each campaign has its own QR code.' },
        { title: 'Print or display it', text: '**Download PNG** to show it on a screen, **Download PDF** ready to print for your booth or your flyers.' },
        { title: 'Play on this screen', text: '**Spin the wheel** opens the form full screen on this tablet or computer: ideal for a guest without a phone. They fill in their first name, last name and e-mail and accept to take part.' },
        { title: 'The queue', text: 'The guest joins the queue: their **position** is shown, then it is their turn, the wheel spins and the result appears. The gift is e-mailed to them. The screen returns to the form by itself for the next person; the bottom-right corner lets you leave.' },
        { title: 'The offline kiosk', text: '**Offline kiosk** opens the same screen served by the event box: it keeps working if the internet connection is cut.' },
        { title: 'Add a contact by hand or by photo', text: '**New prospect** adds someone who did not scan the QR code. Take a **photo of their badge**: SPARK reads the name and e-mail. Otherwise type them in. You can also add them straight to the queue.' },
        { title: 'Follow the queue live', text: 'The **Live queue** panel shows who is playing, who is waiting and the latest results. If needed, **Skip** or **Cancel** the current player.' },
        { title: 'The last 20 players', text: 'The **Last 20 players** list shows their gift, segment, potential and note. **Click a name** to open their card and complete it on the spot.' },
      ],
    },
    es: {
      "title": "Lanzar el evento: código QR, kiosco y cola",
      "summary": "Hacer jugar a sus invitados: por código QR, en la pantalla del stand, o añadiendo un contacto a mano o con una foto de credencial.",
      "steps": [
        {
          "title": "La página Lanzar",
          "text": "Es el puesto de mando del evento. Arriba, **Rueda lista** confirma que la rueda está conectada; al lado, los botones para hacer jugar a alguien. La página sigue la campaña **activa**."
        },
        {
          "title": "El código QR del invitado",
          "text": "Sus invitados **escanean este código QR** con su teléfono: llegan al formulario de la campaña, sin instalar nada. Cada campaña tiene su propio código QR."
        },
        {
          "title": "Imprimirlo o mostrarlo",
          "text": "**Descargar PNG** para mostrarlo en pantalla, **Descargar PDF** listo para imprimir para su stand o sus folletos."
        },
        {
          "title": "Jugar en esta pantalla",
          "text": "**Girar la rueda** abre el formulario a pantalla completa en esta tableta u ordenador: ideal para un invitado sin teléfono. Rellena su nombre, apellido y email y acepta participar."
        },
        {
          "title": "La cola",
          "text": "El invitado entra en la cola: se muestra su **posición**, luego llega su turno, la rueda gira y aparece el resultado. El regalo se le envía por email. La pantalla vuelve sola al formulario para el siguiente; la esquina inferior derecha permite salir."
        },
        {
          "title": "El kiosco sin conexión",
          "text": "**Kiosco sin conexión** abre la misma pantalla servida por la caja del evento: sigue funcionando si se corta la conexión a internet."
        },
        {
          "title": "Añadir un contacto a mano o con foto",
          "text": "**+ Nuevo prospecto** añade a alguien que no escaneó el código QR. Haga una **foto de su credencial**: SPARK lee el nombre y el email. Si no, escríbalos. También puede añadirlo directamente a la cola."
        },
        {
          "title": "Seguir la cola en directo",
          "text": "El panel **Cola en directo** muestra quién juega, quién espera y los últimos resultados. Si hace falta, **Saltar jugador** o **Cancelar jugador** al jugador actual."
        },
        {
          "title": "Los últimos jugadores",
          "text": "La lista de los **Últimos 20 jugadores** muestra su regalo, segmento, potencial y nota. **Haga clic en un nombre** para abrir su ficha y completarla en el momento."
        }
      ]
    },
    de: {
      "title": "Die Veranstaltung starten: QR-Code, Kiosk und Warteschlange",
      "summary": "Ihre Gäste spielen lassen: per QR-Code, am Bildschirm des Stands oder indem Sie einen Kontakt von Hand oder per Badge-Foto hinzufügen.",
      "steps": [
        {
          "title": "Die Seite Start",
          "text": "Das ist die Schaltzentrale der Veranstaltung. Oben bestätigt **Rad bereit**, dass das Rad verbunden ist; daneben die Schaltflächen, um jemanden spielen zu lassen. Die Seite folgt der **aktiven** Kampagne."
        },
        {
          "title": "Der Gäste-QR-Code",
          "text": "Ihre Gäste **scannen diesen QR-Code** mit ihrem Telefon: sie landen im Formular der Kampagne, ohne etwas zu installieren. Jede Kampagne hat ihren eigenen QR-Code."
        },
        {
          "title": "Drucken oder anzeigen",
          "text": "**PNG herunterladen**, um ihn auf einem Bildschirm zu zeigen, **PDF herunterladen**, druckfertig für Ihren Stand oder Ihre Flyer."
        },
        {
          "title": "Auf diesem Bildschirm spielen",
          "text": "**Rad drehen** öffnet das Formular im Vollbild auf diesem Tablet oder Computer: ideal für einen Gast ohne Telefon. Er trägt Vorname, Nachname und E-Mail ein und stimmt der Teilnahme zu."
        },
        {
          "title": "Die Warteschlange",
          "text": "Der Gast reiht sich in die Warteschlange ein: seine **Position** wird angezeigt, dann ist er dran, das Rad dreht sich und das Ergebnis erscheint. Das Geschenk wird ihm per E-Mail geschickt. Der Bildschirm kehrt von selbst zum Formular für den Nächsten zurück; die Ecke unten rechts erlaubt das Verlassen."
        },
        {
          "title": "Der Offline-Kiosk",
          "text": "**Offline-Kiosk** öffnet denselben Bildschirm, bereitgestellt von der Veranstaltungs-Box: er funktioniert weiter, wenn die Internetverbindung unterbrochen ist."
        },
        {
          "title": "Einen Kontakt von Hand oder per Foto hinzufügen",
          "text": "**+ Neuer Interessent** fügt jemanden hinzu, der den QR-Code nicht gescannt hat. Machen Sie ein **Foto seines Badges**: SPARK liest Name und E-Mail. Sonst tippen Sie sie ein. Sie können ihn auch direkt der Warteschlange hinzufügen."
        },
        {
          "title": "Die Warteschlange live verfolgen",
          "text": "Das Feld **Live-Warteschlange** zeigt, wer spielt, wer wartet und die letzten Ergebnisse. Bei Bedarf den aktuellen Spieler **überspringen** oder **abbrechen**."
        },
        {
          "title": "Die letzten Spieler",
          "text": "Die Liste der **letzten 20 Spieler** zeigt Geschenk, Segment, Potenzial und Notiz. **Klicken Sie auf einen Namen**, um sein Profil zu öffnen und direkt zu ergänzen."
        }
      ]
    },
  },
};
