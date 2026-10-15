// Tutorial: what the player sees on their own phone — scan the QR code, fill in the form, wait in line, see the wheel
// spin, get the e-mail. The scene is driven by the tutorial (see fakeBackend.js, window.__demo).
const inp = (k) => () => document.querySelectorAll('form input[required]')[k] || null;

export default {
  id: 'guest-flow',
  icon: 'phone',
  device: 'phone',
  admin: false,
  start: '/play/demo-token',
  steps: [
    { // 1
      async run(c) { await c.waitFor('form'); await c.sleep(600); await c.point('form', 2200); },
    },
    { // 2
      async run(c) {
        await c.type(inp(0), 'Camille'); await c.type(inp(1), 'Dubois'); await c.type(inp(2), 'camille.dubois@exemple.fr');
      },
    },
    { // 3
      async run(c) { await c.click('form input[type=radio]'); await c.point(() => document.querySelector('form input[type=radio]')?.closest('.field'), 1400); },
    },
    { // 4
      async run(c) {
        await c.click('form input[type=checkbox]');
        await c.point('form a', 1600);
      },
    },
    { // 5
      async run(c) {
        await c.click('form button[type=submit]');
        await c.waitFor(() => document.body.innerText.includes('#3')); await c.sleep(2400);
        c.demo('guest', 'waiting0'); await c.sleep(2200);
      },
    },
    { // 6
      async run(c) { c.demo('guest', 'active'); await c.sleep(2400); c.demo('guest', 'spinning'); await c.sleep(2600); },
    },
    { // 7
      async run(c) { c.demo('guest', 'done'); await c.sleep(3200); },
    },
  ],
  texts: {
    fr: {
      title: 'Ce que voit le joueur',
      summary: 'Du QR code au cadeau : le parcours d’un invité sur son téléphone.',
      steps: [
        { title: 'Il scanne le QR code', text: 'L’invité scanne le **QR code** de votre stand avec l’appareil photo de son téléphone. Rien à installer : la page s’ouvre dans le navigateur, **dans la langue de la campagne**.' },
        { title: 'Il remplit le formulaire', text: 'Prénom, nom et **e-mail** sont toujours demandés : c’est à cette adresse que le cadeau sera envoyé.' },
        { title: 'Vos questions', text: 'Les **questions que vous avez ajoutées** à la campagne apparaissent ici : listes, choix, cases à cocher, obligatoires ou non. Leurs réponses arrivent directement dans la fiche du contact.' },
        { title: 'Consentement', text: 'L’invité accepte de participer, et, si vous l’avez activé, il peut aussi accepter de recevoir vos communications. Le lien vers votre **politique de confidentialité** est affiché.' },
        { title: 'Il entre dans la file', text: 'Après validation, il voit sa **position dans la file** et qui joue en ce moment. S’il y a du monde, il peut garder son téléphone en poche : l’écran se met à jour tout seul.' },
        { title: 'C’est son tour', text: 'Quand c’est à lui, l’écran le prévient et la **roue se lance** sur votre stand. Le cadeau est tiré selon l’ordre prévu : personne ne peut le prévoir.' },
        { title: 'Son cadeau', text: 'Le résultat s’affiche et le cadeau lui est **envoyé par e-mail**, avec son QR code de retrait. Chaque joueur ne peut jouer **qu’une fois** par campagne.' },
      ],
    },
    en: {
      title: 'What the player sees',
      summary: 'From QR code to gift: a guest’s journey on their own phone.',
      steps: [
        { title: 'They scan the QR code', text: 'The guest scans your booth’s **QR code** with their phone camera. Nothing to install: the page opens in the browser, **in the campaign’s language**.' },
        { title: 'They fill in the form', text: 'First name, last name and **e-mail** are always asked: the gift is sent to that address.' },
        { title: 'Your questions', text: 'The **questions you added** to the campaign appear here: lists, choices, checkboxes, required or not. Their answers go straight to the contact’s record.' },
        { title: 'Consent', text: 'The guest agrees to take part and, if you turned it on, can also agree to receive your communications. The link to your **privacy policy** is shown.' },
        { title: 'They join the queue', text: 'Once validated, they see their **position in line** and who is playing. If it is busy they can keep the phone in their pocket: the screen updates by itself.' },
        { title: 'It is their turn', text: 'When it is their turn the screen tells them and the **wheel starts** at your booth. The gift is drawn in the planned order: nobody can predict it.' },
        { title: 'Their gift', text: 'The result is shown and the gift is **e-mailed to them**, with its pick-up QR code. Each player can play **only once** per campaign.' },
      ],
    },
    es: {
      "title": "Lo que ve el jugador",
      "summary": "Del código QR al regalo: el recorrido de un invitado en su teléfono.",
      "steps": [
        {
          "title": "Escanea el código QR",
          "text": "El invitado escanea el **código QR** de su stand con la cámara del teléfono. Nada que instalar: la página se abre en el navegador, **en el idioma de la campaña**."
        },
        {
          "title": "Rellena el formulario",
          "text": "Nombre, apellido y **email** siempre se piden: el regalo se envía a esa dirección."
        },
        {
          "title": "Sus preguntas",
          "text": "Las **preguntas que usted añadió** a la campaña aparecen aquí: listas, opciones, casillas, obligatorias o no. Sus respuestas llegan directamente a la ficha del contacto."
        },
        {
          "title": "Consentimiento",
          "text": "El invitado acepta participar y, si lo activó, también puede aceptar recibir sus comunicaciones. Se muestra el enlace a su **política de privacidad**."
        },
        {
          "title": "Entra en la cola",
          "text": "Tras validar, ve su **posición en la cola** y quién está jugando. Si hay mucha gente puede guardar el teléfono en el bolsillo: la pantalla se actualiza sola."
        },
        {
          "title": "Es su turno",
          "text": "Cuando le toca, la pantalla le avisa y la **rueda se lanza** en su stand. El regalo se sortea según el orden previsto: nadie puede preverlo."
        },
        {
          "title": "Su regalo",
          "text": "Se muestra el resultado y el regalo se le **envía por email**, con su código QR de canje. Cada jugador solo puede jugar **una vez** por campaña."
        }
      ]
    },
    de: {
      "title": "Was der Spieler sieht",
      "summary": "Vom QR-Code zum Geschenk: der Weg eines Gastes auf seinem Telefon.",
      "steps": [
        {
          "title": "Er scannt den QR-Code",
          "text": "Der Gast scannt den **QR-Code** Ihres Stands mit der Kamera seines Telefons. Nichts zu installieren: die Seite öffnet sich im Browser, **in der Sprache der Kampagne**."
        },
        {
          "title": "Er füllt das Formular aus",
          "text": "Vorname, Nachname und **E-Mail** werden immer abgefragt: an diese Adresse wird das Geschenk geschickt."
        },
        {
          "title": "Ihre Fragen",
          "text": "Die **Fragen, die Sie hinzugefügt haben**, erscheinen hier: Listen, Auswahl, Kontrollkästchen, Pflicht oder nicht. Ihre Antworten gehen direkt ins Profil des Kontakts."
        },
        {
          "title": "Einwilligung",
          "text": "Der Gast stimmt der Teilnahme zu und kann, wenn Sie es aktiviert haben, auch dem Erhalt Ihrer Mitteilungen zustimmen. Der Link zu Ihrer **Datenschutzerklärung** wird angezeigt."
        },
        {
          "title": "Er reiht sich in die Warteschlange ein",
          "text": "Nach der Bestätigung sieht er seine **Position in der Schlange** und wer gerade spielt. Ist viel los, kann er das Telefon in der Tasche lassen: der Bildschirm aktualisiert sich von selbst."
        },
        {
          "title": "Er ist dran",
          "text": "Wenn er an der Reihe ist, meldet es der Bildschirm und das **Rad startet** an Ihrem Stand. Das Geschenk wird in der geplanten Reihenfolge gezogen: niemand kann es vorhersehen."
        },
        {
          "title": "Sein Geschenk",
          "text": "Das Ergebnis wird angezeigt und das Geschenk wird ihm **per E-Mail geschickt**, mit seinem Abhol-QR-Code. Jeder Spieler kann pro Kampagne **nur einmal** spielen."
        }
      ]
    },
  },
};
