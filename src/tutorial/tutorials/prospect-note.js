// Tutorial: complete a prospect's card on the spot — dictate a voice note, let the AI assistant fill the card, save.
const SAID = {
  fr: 'Cliente intéressée par une cuisine neuve en mars, budget autour de mille cinq cents euros, à rappeler après le salon.',
  en: 'Customer interested in a new kitchen in March, budget around fifteen hundred euros, call back after the show.',
  es: 'Clienta interesada en una cocina nueva en marzo, presupuesto de unos mil quinientos euros, llamar después de la feria.',
  de: 'Kundin interessiert an einer neuen Küche im März, Budget etwa fünfzehnhundert Euro, nach der Messe zurückrufen.',
};

export default {
  id: 'prospect-note',
  icon: 'mic',
  device: 'desktop',
  admin: false,
  start: '/launch',
  steps: [
    { // 1
      async run(c) {
        await c.waitFor('table.data-table tbody tr'); await c.sleep(400);
        await c.click('table.data-table tbody tr:nth-child(2)');
        await c.waitFor('.pc'); await c.sleep(1200);
        await c.point('.pc-head', 1800);
      },
    },
    { // 2
      async run(c) { await c.point('.pc-note', 2400); },
    },
    { // 3
      async run(c) {
        c.demo('dictation', SAID[c.lang] || SAID.en);
        await c.click('.pc-rec');
        await c.waitFor('.pc-rec.on'); await c.sleep(600);
        await c.waitFor(() => { const t = document.querySelector('.pc-textarea'); return t && t.value.length > 20 ? t : null; }, 8000);
        await c.sleep(1400);
        await c.click('.pc-rec.on');
        await c.sleep(600);
      },
    },
    { // 4
      async run(c) {
        await c.waitFor(() => (document.querySelector('.pc-spin') ? null : document.querySelector('.pc-main')), 8000);
        await c.sleep(1200);
        await c.point('.pc-main > section:nth-of-type(2)', 2800);
      },
    },
    { // 5
      async run(c) { await c.point('.pc-potential', 2200); },
    },
    { // 6
      async run(c) { await c.point('.pc-side', 2800); },
    },
    { // 7
      async run(c) {
        await c.click('.pc-actionbar .btn-primary');
        await c.waitFor(() => (document.querySelector('.pc') ? null : document.body)); await c.sleep(900);
        await c.point('table.data-table tbody tr:nth-child(2)', 2200);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Note vocale et assistant IA',
      summary: 'Dictez une note en 10 secondes : l’assistant remplit la fiche, note le potentiel et propose les prochaines actions.',
      steps: [
        { title: 'Ouvrir la fiche', text: 'Sur le stand, cliquez sur un joueur dans la liste des derniers joueurs : sa fiche s’ouvre, **prête à être complétée**. C’est la même sur téléphone, dans l’application SPARK installée.' },
        { title: 'La note', text: 'La **note** est votre mémoire de la discussion : projet, budget, date de rappel. Vous pouvez la **taper**… ou la **dicter**.' },
        { title: 'Dicter', text: 'Touchez **Enregistrer une note vocale** et parlez normalement : le texte s’écrit tout seul. Touchez **Arrêter** (ou laissez 8 secondes de silence) pour terminer. Fonctionne dans Chrome et Edge, avec une connexion internet.' },
        { title: 'L’assistant remplit la fiche', text: 'Dès la dictée terminée, l’**assistant IA** lit la note et **remplit la fiche** : segment (ici le budget), champs personnalisés comme le projet… Il n’invente rien : il n’utilise que vos catégories et vos champs.' },
        { title: 'Le potentiel', text: 'Il attribue aussi un **potentiel** de 1 à 3 étoiles (intérêt limité, à qualifier, intention claire ou échéance proche) et ajoute des **étiquettes**. Vous gardez la main : tout se corrige d’un clic.' },
        { title: 'Prochaines actions', text: 'À droite, des **actions suggérées** (envoyer un devis, proposer un rendez-vous…) pour ne rien oublier après le salon. Votre note d’origine reste conservée telle quelle.' },
        { title: 'Enregistrer', text: '**Enregistrer** ferme la fiche : la note apparaît dans la liste et dans le CRM, accessible à toute votre équipe.' },
      ],
    },
    en: {
      title: 'Voice note and AI assistant',
      summary: 'Dictate a note in 10 seconds: the assistant fills the record, rates the potential and suggests the next actions.',
      steps: [
        { title: 'Open the record', text: 'At the booth, click a player in the list of latest players: their record opens, **ready to complete**. It is the same on a phone, in the installed SPARK app.' },
        { title: 'The note', text: 'The **note** is your memory of the conversation: project, budget, callback date. You can **type** it… or **dictate** it.' },
        { title: 'Dictate', text: 'Tap **Record voice note** and speak normally: the text writes itself. Tap **Stop** (or leave 8 seconds of silence) to finish. Works in Chrome and Edge, with an internet connection.' },
        { title: 'The assistant fills the record', text: 'As soon as the dictation ends, the **AI assistant** reads the note and **fills the record**: segment (here the budget), custom fields like the project… It invents nothing: it only uses your categories and fields.' },
        { title: 'Potential', text: 'It also sets a **potential** of 1 to 3 stars (limited interest, to qualify, clear intent or near deadline) and adds **tags**. You stay in control: everything can be corrected in one click.' },
        { title: 'Next actions', text: 'On the right, **suggested actions** (send a quote, offer an appointment…) so nothing is forgotten after the show. Your original note is kept exactly as written.' },
        { title: 'Save', text: '**Save** closes the record: the note appears in the list and in the CRM, available to your whole team.' },
      ],
    },
    es: {
      "title": "Nota de voz y asistente IA",
      "summary": "Dicte una nota en 10 segundos: el asistente rellena la ficha, valora el potencial y propone las siguientes acciones.",
      "steps": [
        {
          "title": "Abrir la ficha",
          "text": "En el stand, haga clic en un jugador de la lista de últimos jugadores: se abre su ficha, **lista para completar**. Es la misma en el teléfono, en la aplicación SPARK instalada."
        },
        {
          "title": "La nota",
          "text": "La **nota** es su memoria de la conversación: proyecto, presupuesto, fecha de llamada. Puede **escribirla**… o **dictarla**."
        },
        {
          "title": "Dictar",
          "text": "Toque **Grabar nota de voz** y hable con normalidad: el texto se escribe solo. Toque **Detener** (o deje 8 segundos de silencio) para terminar. Funciona en Chrome y Edge, con conexión a internet."
        },
        {
          "title": "El asistente rellena la ficha",
          "text": "En cuanto termina el dictado, el **asistente IA** lee la nota y **rellena la ficha**: segmento (aquí el presupuesto), campos personalizados como el proyecto… No inventa nada: solo usa sus categorías y sus campos."
        },
        {
          "title": "El potencial",
          "text": "También asigna un **potencial** de 1 a 3 estrellas (interés limitado, por cualificar, intención clara o plazo cercano) y añade **etiquetas**. Usted mantiene el control: todo se corrige con un clic."
        },
        {
          "title": "Próximas acciones",
          "text": "A la derecha, **acciones sugeridas** (enviar un presupuesto, proponer una cita…) para no olvidar nada después de la feria. Su nota original se conserva tal cual."
        },
        {
          "title": "Guardar",
          "text": "**Guardar** cierra la ficha: la nota aparece en la lista y en el CRM, disponible para todo su equipo."
        }
      ]
    },
    de: {
      "title": "Sprachnotiz und KI-Assistent",
      "summary": "Diktieren Sie eine Notiz in 10 Sekunden: der Assistent füllt das Profil aus, bewertet das Potenzial und schlägt die nächsten Aktionen vor.",
      "steps": [
        {
          "title": "Das Profil öffnen",
          "text": "Klicken Sie am Stand in der Liste der letzten Spieler auf einen Spieler: sein Profil öffnet sich, **bereit zum Ergänzen**. Es ist dasselbe auf dem Telefon, in der installierten SPARK-App."
        },
        {
          "title": "Die Notiz",
          "text": "Die **Notiz** ist Ihre Erinnerung an das Gespräch: Projekt, Budget, Rückrufdatum. Sie können sie **tippen** … oder **diktieren**."
        },
        {
          "title": "Diktieren",
          "text": "Tippen Sie auf **Sprachnotiz aufnehmen** und sprechen Sie normal: der Text schreibt sich von selbst. Tippen Sie auf **Stopp** (oder lassen Sie 8 Sekunden Stille), um zu beenden. Funktioniert in Chrome und Edge, mit Internetverbindung."
        },
        {
          "title": "Der Assistent füllt das Profil aus",
          "text": "Sobald das Diktat endet, liest der **KI-Assistent** die Notiz und **füllt das Profil aus**: Segment (hier das Budget), benutzerdefinierte Felder wie das Projekt … Er erfindet nichts: er verwendet nur Ihre Kategorien und Felder."
        },
        {
          "title": "Das Potenzial",
          "text": "Er vergibt auch ein **Potenzial** von 1 bis 3 Sternen (begrenztes Interesse, zu qualifizieren, klare Absicht oder nahe Frist) und fügt **Tags** hinzu. Sie behalten die Kontrolle: alles lässt sich mit einem Klick korrigieren."
        },
        {
          "title": "Nächste Aktionen",
          "text": "Rechts **vorgeschlagene Aktionen** (Angebot senden, Termin vorschlagen …), damit nach der Messe nichts vergessen wird. Ihre ursprüngliche Notiz bleibt genau so erhalten."
        },
        {
          "title": "Speichern",
          "text": "**Speichern** schließt das Profil: die Notiz erscheint in der Liste und im CRM, für Ihr ganzes Team verfügbar."
        }
      ]
    },
  },
};
