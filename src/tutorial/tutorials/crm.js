// Tutorial: the CRM — all your contacts, search and filters, the prospect card, export.
const closeCard = '.pc-topbar .pc-only-desktop';

export default {
  id: 'crm',
  icon: 'people',
  device: 'desktop',
  admin: false,
  start: '/history',
  steps: [
    { // 1
      async run(c) { await c.waitFor('table.data-table'); await c.sleep(500); await c.point('.tabs', 1600); await c.point('table.data-table', 2400); },
    },
    { // 2
      async run(c) { await c.type('.card input[placeholder]', 'martin'); await c.sleep(900); await c.point('table.data-table', 1400); await c.type('.card input[placeholder]', ''); },
    },
    { // 3
      async run(c) {
        await c.click(() => document.querySelector('.card input[placeholder]')?.parentElement.querySelector('button'));
        await c.waitFor('.modal-card'); await c.sleep(800);
        await c.point('.modal-card', 2200);
        await c.click('.modal-card input[type=checkbox]'); await c.sleep(900);
        await c.click(() => [...document.querySelectorAll('.modal-card button')].pop()); await c.sleep(700);
      },
    },
    { // 4
      async run(c) { await c.point('table.data-table', 2600); },
    },
    { // 5
      async run(c) {
        await c.click('table.data-table tbody tr button');
        await c.waitFor('.pc'); await c.sleep(1500);
        await c.point('.pc-main', 2200);
      },
    },
    { // 6
      async run(c) { await c.point('.pc-potential', 2400); },
    },
    { // 7
      async run(c) { await c.point('.pc-main > section:nth-of-type(2)', 2600); },
    },
    { // 8
      async run(c) { await c.point('.pc-side', 2600); },
    },
    { // 9
      async run(c) {
        await c.click(closeCard); await c.sleep(600);
        await c.click('.card button.btn-secondary');
        await c.waitFor('.modal-card'); await c.sleep(800);
        await c.point('.modal-card', 2400);
        await c.click(() => [...document.querySelectorAll('.modal-card button')].pop()); await c.sleep(500);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Le CRM : retrouver et qualifier vos contacts',
      summary: 'Tous les contacts de vos campagnes au même endroit : rechercher, filtrer, compléter une fiche, exporter.',
      steps: [
        { title: 'Tous vos contacts', text: 'Le **CRM** réunit les contacts de **toutes vos campagnes** : joueurs, contacts ajoutés à la main et ceux qui n’ont pas de cadeau. Chaque ligne indique le cadeau, la campagne, l’état de la remise, le segment et la note.' },
        { title: 'Rechercher', text: 'Tapez un nom, un e-mail, un cadeau ou un mot de la note : la liste se **filtre au fur et à mesure**.' },
        { title: 'Les filtres', text: '**Filtres** combine campagne, cadeau, état, segment et note. Ne sont proposées que les valeurs qui existent dans vos données.' },
        { title: 'Lire le tableau', text: 'L’**état** dit si le cadeau est à remettre, remis, expiré ou annulé. Un **e-mail** peut porter un indicateur de qualité (valide, risqué…). Les contacts sans e-mail sont signalés.' },
        { title: 'Ouvrir une fiche', text: 'Cliquez sur un **nom** pour ouvrir sa fiche : coordonnées, réponses au formulaire, note de votre commercial. C’est le même écran que sur le téléphone, en plus large.' },
        { title: 'Le potentiel', text: 'Les **étoiles** (1 à 3) mesurent le potentiel commercial du contact. Un clic suffit pour le noter, vous pouvez aussi ajouter des **étiquettes** pour le retrouver.' },
        { title: 'Qualifier le contact', text: 'La **segmentation** et les **champs personnalisés** que vous avez définis pour la campagne se remplissent ici (budget, projet, rendez-vous…).' },
        { title: 'Historique et notes', text: 'À droite : l’**historique** du contact (a joué, cadeau envoyé, note modifiée…), ses autres campagnes et les **notes** ajoutées par l’équipe.' },
        { title: 'Exporter', text: '**Exporter** télécharge vos contacts en **CSV, PDF ou JSON**, avec les mêmes filtres que l’écran et une plage de dates. Chaque export est tracé pour votre conformité RGPD.' },
      ],
    },
    en: {
      title: 'The CRM: find and qualify your contacts',
      summary: 'All the contacts of your campaigns in one place: search, filter, complete a record, export.',
      steps: [
        { title: 'All your contacts', text: 'The **CRM** gathers the contacts of **all your campaigns**: players, contacts added by hand and those without a gift. Each row shows the gift, the campaign, the hand-over status, the segment and the note.' },
        { title: 'Search', text: 'Type a name, e-mail, gift or a word from the note: the list **filters as you type**.' },
        { title: 'Filters', text: '**Filters** combine campaign, gift, status, segment and note. Only values that exist in your data are offered.' },
        { title: 'Read the table', text: 'The **status** tells if the gift is to hand over, handed over, expired or cancelled. An **e-mail** can carry a quality badge (valid, risky…). Contacts without an e-mail are flagged.' },
        { title: 'Open a record', text: 'Click a **name** to open their record: contact details, answers to the form, your sales rep’s note. It is the same screen as on the phone, only wider.' },
        { title: 'Potential', text: 'The **stars** (1 to 3) measure the contact’s sales potential. One click rates it, and you can add **tags** to find it again.' },
        { title: 'Qualify the contact', text: 'The **segmentation** and **custom fields** you defined for the campaign are filled in here (budget, project, appointment…).' },
        { title: 'History and notes', text: 'On the right: the contact’s **history** (played, gift sent, note edited…), their other campaigns and the **notes** added by the team.' },
        { title: 'Export', text: '**Export** downloads your contacts as **CSV, PDF or JSON**, with the same filters as the screen and a date range. Every export is logged for your GDPR compliance.' },
      ],
    },
    es: {
      "title": "El CRM: encontrar y cualificar sus contactos",
      "summary": "Todos los contactos de sus campañas en un solo lugar: buscar, filtrar, completar una ficha, exportar.",
      "steps": [
        {
          "title": "Todos sus contactos",
          "text": "El **CRM** reúne los contactos de **todas sus campañas**: jugadores, contactos añadidos a mano y los que no tienen regalo. Cada fila indica el regalo, la campaña, el estado de la entrega, el segmento y la nota."
        },
        {
          "title": "Buscar",
          "text": "Escriba un nombre, un email, un regalo o una palabra de la nota: la lista se **filtra mientras escribe**."
        },
        {
          "title": "Los filtros",
          "text": "**Filtros** combina campaña, regalo, estado, segmento y nota. Solo se ofrecen los valores que existen en sus datos."
        },
        {
          "title": "Leer la tabla",
          "text": "El **estado** indica si el regalo está por distribuir, distribuido, caducado o cancelado. Un **email** puede llevar un indicador de calidad (válido, arriesgado…). Los contactos sin email se señalan."
        },
        {
          "title": "Abrir una ficha",
          "text": "Haga clic en un **nombre** para abrir su ficha: datos de contacto, respuestas del formulario, nota de su comercial. Es la misma pantalla que en el teléfono, solo que más ancha."
        },
        {
          "title": "El potencial",
          "text": "Las **estrellas** (1 a 3) miden el potencial comercial del contacto. Un clic basta para valorarlo, y puede añadir **etiquetas** para encontrarlo."
        },
        {
          "title": "Cualificar el contacto",
          "text": "La **segmentación** y los **campos personalizados** que definió para la campaña se rellenan aquí (presupuesto, proyecto, cita…)."
        },
        {
          "title": "Historial y notas",
          "text": "A la derecha: el **historial** del contacto (jugó, regalo enviado, nota modificada…), sus otras campañas y las **notas** añadidas por el equipo."
        },
        {
          "title": "Exportar",
          "text": "**Exportar** descarga sus contactos en **CSV, PDF o JSON**, con los mismos filtros que la pantalla y un rango de fechas. Cada exportación queda registrada para su cumplimiento del RGPD."
        }
      ]
    },
    de: {
      "title": "Das CRM: Kontakte finden und qualifizieren",
      "summary": "Alle Kontakte Ihrer Kampagnen an einem Ort: suchen, filtern, ein Profil ergänzen, exportieren.",
      "steps": [
        {
          "title": "Alle Ihre Kontakte",
          "text": "Das **CRM** vereint die Kontakte **all Ihrer Kampagnen**: Spieler, von Hand hinzugefügte Kontakte und solche ohne Geschenk. Jede Zeile zeigt Geschenk, Kampagne, Status der Übergabe, Segment und Notiz."
        },
        {
          "title": "Suchen",
          "text": "Geben Sie einen Namen, eine E-Mail, ein Geschenk oder ein Wort aus der Notiz ein: die Liste **filtert sich beim Tippen**."
        },
        {
          "title": "Die Filter",
          "text": "**Filter** kombiniert Kampagne, Geschenk, Status, Segment und Notiz. Angeboten werden nur Werte, die in Ihren Daten vorkommen."
        },
        {
          "title": "Die Tabelle lesen",
          "text": "Der **Status** zeigt, ob das Geschenk zu verteilen, verteilt, abgelaufen oder abgebrochen ist. Eine **E-Mail** kann ein Qualitätssiegel tragen (gültig, riskant …). Kontakte ohne E-Mail werden markiert."
        },
        {
          "title": "Ein Profil öffnen",
          "text": "Klicken Sie auf einen **Namen**, um sein Profil zu öffnen: Kontaktdaten, Antworten aus dem Formular, Notiz Ihres Vertriebsmitarbeiters. Es ist derselbe Bildschirm wie auf dem Telefon, nur breiter."
        },
        {
          "title": "Das Potenzial",
          "text": "Die **Sterne** (1 bis 3) messen das Verkaufspotenzial des Kontakts. Ein Klick genügt zum Bewerten, und Sie können **Tags** hinzufügen, um ihn wiederzufinden."
        },
        {
          "title": "Den Kontakt qualifizieren",
          "text": "Die **Segmentierung** und die **benutzerdefinierten Felder**, die Sie für die Kampagne festgelegt haben, werden hier ausgefüllt (Budget, Projekt, Termin …)."
        },
        {
          "title": "Verlauf und Notizen",
          "text": "Rechts: der **Verlauf** des Kontakts (hat gespielt, Geschenk gesendet, Notiz geändert …), seine anderen Kampagnen und die vom Team hinzugefügten **Notizen**."
        },
        {
          "title": "Exportieren",
          "text": "**Exportieren** lädt Ihre Kontakte als **CSV, PDF oder JSON** herunter, mit denselben Filtern wie die Anzeige und einem Datumsbereich. Jeder Export wird für Ihre DSGVO-Konformität protokolliert."
        }
      ]
    },
  },
};
