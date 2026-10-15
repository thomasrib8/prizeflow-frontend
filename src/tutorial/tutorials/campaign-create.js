// Tutorial: create a campaign — name, the 12 gifts (drag and drop onto the wheel, or a template), segmentation,
// custom fields, the guest form, the settings, and the final "Create".
const nextBtn = () => document.querySelector('form > div:last-child button:first-child');
const dashed = (n = 0) => () => [...document.querySelectorAll('form button')].filter((b) => (b.getAttribute('style') || '').includes('dashed'))[n] || null;
const card = (n) => `form > .card:nth-of-type(${n})`;

export default {
  id: 'campaign-create',
  icon: 'plus',
  device: 'desktop',
  admin: false,
  start: '/campaigns',
  steps: [
    { // 1
      async run(c) { await c.click('.page-header button'); await c.waitFor('.gift-list'); await c.sleep(600); },
    },
    { // 2
      async run(c) {
        await c.type('form .field input[required]', c.lang === 'en' ? 'Autumn Show 2026' : 'Salon Automne 2026');
        await c.type('form .field input:not([required])', c.lang === 'en' ? 'Lyon Expo Hall' : 'Eurexpo Lyon');
        await c.point('form .field select', 1400);
      },
    },
    { // 3
      async run(c) { await c.point('.planner-wheel', 2200); await c.point('.gift-list', 1800); },
    },
    { // 4
      async run(c) {
        await c.type('.gift-card:nth-child(1) .gift-row input:not([type])', c.gifts[0]);
        await c.type('.gift-card:nth-child(1) .gift-row input[type=number]', '400');
        await c.point('.gift-card:nth-child(1) .gift-row select', 1500);
      },
    },
    { // 5
      async run(c) {
        await c.drag('.gift-card:nth-child(1) .gift-handle', '.planner-wheel [data-case="0"]');
        await c.waitFor('.gift-card:nth-child(1).placed');
        await c.sleep(900);
      },
    },
    { // 6
      async run(c) {
        await c.select(() => [...document.querySelectorAll('form .field select')].find((s) => [...s.options].some((o) => o.value === 'tpl_demo')), 'tpl_demo');
        await c.waitFor('.gift-card:nth-child(12).placed');
        await c.sleep(900);
        // the template brings the names and the places, not the stock: one number per gift
        await c.point('.gift-card:nth-child(2) .gift-row input[type=number]', 1200);
        for (let i = 1; i <= 12; i += 1) await c.fill(`.gift-card:nth-child(${i}) .gift-row input[type=number]`, String(c.stocks[i - 1]));
        await c.sleep(500);
        await c.point('.planner-wheel', 1800);
        await c.click(nextBtn);
        await c.waitFor(dashed(0)); await c.sleep(500);
      },
    },
    { // 7
      async run(c) {
        await c.click(dashed(0));
        await c.type('form input[placeholder][style*="font-weight: 700"]', 'Budget');
        const opts = c.lang === 'en' ? ['Under €500', '€500 to €2,000', 'Over €2,000'] : c.lang === 'es' ? ['Menos de 500 €', '500 a 2.000 €', 'Más de 2.000 €'] : c.lang === 'de' ? ['Unter 500 €', '500 bis 2.000 €', 'Über 2.000 €'] : ['Moins de 500 €', '500 à 2 000 €', 'Plus de 2 000 €'];
        const optInput = (k) => () => document.querySelectorAll('form input[placeholder][style*="font-size: 13px"]')[k] || null;
        const addOpt = () => [...document.querySelectorAll('form button')].find((b) => (b.getAttribute('style') || '').includes('margin-left: 28px'));
        await c.type(optInput(0), opts[0]);
        await c.click(addOpt); await c.type(optInput(1), opts[1]);
        await c.click(addOpt); await c.type(optInput(2), opts[2]);
        await c.sleep(600);
      },
    },
    { // 8
      async run(c) {
        await c.click(dashed(1));
        await c.type('form input[placeholder][style*="flex: 1 1 180px"]', c.lang === 'en' ? 'Project' : c.lang === 'es' ? 'Proyecto' : c.lang === 'de' ? 'Projekt' : 'Projet');
        await c.point('form select[style*="flex: 0 0 170px"]', 1800);
      },
    },
    { // 9
      async run(c) {
        await c.click(nextBtn);
        await c.waitFor(dashed(0)); await c.sleep(700);
        await c.point('form .card:nth-of-type(1)', 1800);
        await c.click(dashed(0));
        await c.type('form input[placeholder][style*="flex: 1 1 180px"]', c.lang === 'en' ? 'How did you hear about us?' : c.lang === 'es' ? '¿Cómo nos conoció?' : c.lang === 'de' ? 'Wie haben Sie uns gefunden?' : 'Comment nous avez-vous connus ?');
        await c.select('form select[style*="flex: 0 0 170px"]', 'single_choice');
        const optInput = (k) => () => document.querySelectorAll('form input[placeholder][style*="font-size: 13px"]')[k] || null;
        const addOpt = () => [...document.querySelectorAll('form button')].find((b) => (b.getAttribute('style') || '').includes('margin-left: 28px'));
        await c.type(optInput(0), c.lang === 'en' ? 'Social media' : c.lang === 'es' ? 'Redes sociales' : c.lang === 'de' ? 'Soziale Medien' : 'Réseaux sociaux');
        await c.click(addOpt); await c.type(optInput(1), c.lang === 'en' ? 'Word of mouth' : c.lang === 'es' ? 'Boca a boca' : c.lang === 'de' ? 'Mundpropaganda' : 'Bouche à oreille');
        await c.click('form input[type=checkbox]');
        await c.sleep(500);
      },
    },
    { // 10
      async run(c) {
        await c.click(nextBtn);
        await c.waitFor('form button[type=submit]'); await c.sleep(700);
        await c.point('form > div:first-child', 2200);
      },
    },
    { // 11
      async run(c) {
        await c.click('form button[type=submit]');
        await c.waitFor('.camp-actions'); await c.sleep(1000);
        await c.point('.camp-actions', 1800);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Créer une campagne',
      summary: 'Nommer la campagne, placer les 12 cadeaux sur la roue, segmenter vos contacts et régler le formulaire.',
      steps: [
        { title: 'Lancer l’assistant', text: 'Sur la page **Campagnes**, le bouton **Nouvelle campagne** ouvre un assistant en 4 étapes : cadeaux, segmentation, formulaire invité et réglages.' },
        { title: 'Nommer la campagne', text: 'Donnez un **nom** à la campagne et, si vous voulez, le nom de l’événement. Vous choisissez aussi la **langue du formulaire** que verront vos invités.' },
        { title: 'Les 12 cases de la roue', text: 'La roue compte **12 cases**. Chaque case reçoit un cadeau avec son stock : SPARK en déduit la probabilité de gain, affichée en %. Il faut remplir les 12 cases pour continuer.' },
        { title: 'Décrire un cadeau', text: 'Saisissez le **nom** et le **stock** du cadeau. Le **mode de retrait** (QR, code, bon ou personnalisé) définit comment le gagnant récupérera son lot.' },
        { title: 'Glisser le cadeau sur la roue', text: 'Attrapez la poignée **Glisser** et déposez le cadeau sur la case de votre choix : elle prend la couleur du cadeau. Sans souris, la liste « Placer dans la case » fait la même chose.' },
        { title: 'Gagner du temps avec un modèle', text: 'Vous avez déjà une configuration type ? Choisissez un **modèle** : les 12 cadeaux se placent d’un coup, il ne reste qu’à saisir les stocks. Vous pouvez enregistrer vos propres modèles, ou dupliquer une campagne existante.' },
        { title: 'La segmentation client', text: 'À l’étape 2, créez vos **catégories** (par exemple le budget, avec ses options). Vos commerciaux les renseignent ensuite dans la fiche de chaque contact pour les classer.' },
        { title: 'Vos propres champs', text: 'Ajoutez des **champs personnalisés** pour les fiches contacts : texte, liste, choix multiple, date… Ils apparaissent dans le CRM de vos équipes.' },
        { title: 'Le formulaire invité', text: 'À l’étape 3, définissez ce que le joueur remplit avant de tourner. Prénom, nom et e-mail sont toujours demandés ; ajoutez vos **questions**, obligatoires ou non, avec des réponses à choisir.' },
        { title: 'Les réglages', text: 'L’étape 4 règle les **avis Google**, les **réseaux sociaux**, le consentement marketing et l’e-mail de récompense. Tout reste modifiable plus tard.' },
        { title: 'Créer la campagne', text: '**Créer la campagne** l’enregistre en brouillon avec ses 12 cadeaux. Il ne reste qu’à la **démarrer** (voir le tutoriel sur l’activation et la pause).' },
      ],
    },
    en: {
      title: 'Create a campaign',
      summary: 'Name the campaign, place the 12 gifts on the wheel, segment your contacts and set the form.',
      steps: [
        { title: 'Start the assistant', text: 'On the **Campaigns** page, the **New campaign** button opens a 4-step assistant: gifts, segmentation, guest form and settings.' },
        { title: 'Name the campaign', text: 'Give the campaign a **name** and, if you like, the name of the event. You also choose the **language of the form** your guests will see.' },
        { title: 'The 12 cases of the wheel', text: 'The wheel has **12 cases**. Each case holds a gift with its stock: SPARK works out the chance of winning, shown as a %. All 12 cases must be filled to continue.' },
        { title: 'Describe a gift', text: 'Enter the gift’s **name** and **stock**. The **redeem method** (QR, code, voucher or custom) sets how the winner collects the prize.' },
        { title: 'Drag the gift onto the wheel', text: 'Grab the **Drag** handle and drop the gift on the case you want: it takes the gift’s colour. Without a mouse, the “Place in case” list does the same.' },
        { title: 'Save time with a template', text: 'Already have a standard setup? Pick a **template**: the 12 gifts are placed at once and you only enter the stock. You can save your own templates, or duplicate an existing campaign.' },
        { title: 'Customer segmentation', text: 'In step 2, create your **categories** (for example budget, with its options). Your sales reps then fill them in on each contact to classify them.' },
        { title: 'Your own fields', text: 'Add **custom fields** to contact records: text, list, multiple choice, date… They appear in your team’s CRM.' },
        { title: 'The guest form', text: 'In step 3, define what the player fills in before spinning. First name, last name and e-mail are always asked; add your own **questions**, required or not, with answers to pick from.' },
        { title: 'Settings', text: 'Step 4 sets the **Google reviews**, the **social networks**, marketing consent and the reward e-mail. Everything can be changed later.' },
        { title: 'Create the campaign', text: '**Create the campaign** saves it as a draft with its 12 gifts. All that is left is to **start** it (see the tutorial on activating and pausing).' },
      ],
    },
    es: {
      "title": "Crear una campaña",
      "summary": "Nombrar la campaña, colocar los 12 regalos en la rueda, segmentar sus contactos y configurar el formulario.",
      "steps": [
        {
          "title": "Iniciar el asistente",
          "text": "En la página **Campañas**, el botón **+ Nueva campaña** abre un asistente de 4 pasos: regalos, segmentación, formulario del invitado y ajustes."
        },
        {
          "title": "Nombrar la campaña",
          "text": "Dele un **nombre** a la campaña y, si lo desea, el nombre del evento. También elige el **idioma del formulario** que verán sus invitados."
        },
        {
          "title": "Las 12 casillas de la rueda",
          "text": "La rueda tiene **12 casillas**. Cada casilla contiene un regalo con su stock: SPARK calcula la probabilidad de ganar, mostrada en %. Hay que llenar las 12 casillas para continuar."
        },
        {
          "title": "Describir un regalo",
          "text": "Introduzca el **nombre** y el **stock** del regalo. El **modo de canje** (QR, código, vale o personalizado) define cómo recogerá el premio el ganador."
        },
        {
          "title": "Arrastrar el regalo a la rueda",
          "text": "Agarre el tirador **Arrastrar** y suelte el regalo en la casilla que quiera: toma el color del regalo. Sin ratón, la lista «Colocar en la casilla» hace lo mismo."
        },
        {
          "title": "Ahorrar tiempo con una plantilla",
          "text": "¿Ya tiene una configuración tipo? Elija una **plantilla**: los 12 regalos se colocan de golpe y solo queda introducir los stocks. Puede guardar sus propias plantillas o duplicar una campaña existente."
        },
        {
          "title": "La segmentación de clientes",
          "text": "En el paso 2, cree sus **categorías** (por ejemplo el presupuesto, con sus opciones). Sus comerciales las rellenan después en la ficha de cada contacto para clasificarlos."
        },
        {
          "title": "Sus propios campos",
          "text": "Añada **campos personalizados** a las fichas de contacto: texto, lista, opción múltiple, fecha… Aparecen en el CRM de su equipo."
        },
        {
          "title": "El formulario del invitado",
          "text": "En el paso 3, defina lo que rellena el jugador antes de girar. Nombre, apellido y email siempre se piden; añada sus **preguntas**, obligatorias o no, con respuestas para elegir."
        },
        {
          "title": "Los ajustes",
          "text": "El paso 4 configura las **reseñas de Google**, las **redes sociales**, el consentimiento de marketing y el email de recompensa. Todo se puede cambiar después."
        },
        {
          "title": "Crear la campaña",
          "text": "**Crear campaña** la guarda como borrador con sus 12 regalos. Solo queda **iniciarla** (vea el tutorial sobre activar y pausar)."
        }
      ]
    },
    de: {
      "title": "Eine Kampagne erstellen",
      "summary": "Die Kampagne benennen, die 12 Geschenke auf dem Rad platzieren, Ihre Kontakte segmentieren und das Formular einrichten.",
      "steps": [
        {
          "title": "Den Assistenten starten",
          "text": "Auf der Seite **Kampagnen** öffnet **+ Neue Kampagne** einen Assistenten in 4 Schritten: Geschenke, Segmentierung, Gästeformular und Einstellungen."
        },
        {
          "title": "Die Kampagne benennen",
          "text": "Geben Sie der Kampagne einen **Namen** und, wenn Sie möchten, den Namen der Veranstaltung. Sie wählen auch die **Sprache des Formulars**, das Ihre Gäste sehen."
        },
        {
          "title": "Die 12 Felder des Rads",
          "text": "Das Rad hat **12 Felder**. Jedes Feld enthält ein Geschenk mit seinem Bestand: SPARK berechnet daraus die Gewinnchance in %. Alle 12 Felder müssen belegt sein, um fortzufahren."
        },
        {
          "title": "Ein Geschenk beschreiben",
          "text": "Geben Sie **Name** und **Bestand** des Geschenks ein. Die **Einlöseart** (QR, Code, Gutschein oder individuell) legt fest, wie der Gewinner seinen Preis abholt."
        },
        {
          "title": "Das Geschenk aufs Rad ziehen",
          "text": "Greifen Sie den Griff **Ziehen** und lassen Sie das Geschenk auf dem gewünschten Feld los: es nimmt die Farbe des Geschenks an. Ohne Maus erledigt die Liste „In Feld platzieren“ dasselbe."
        },
        {
          "title": "Zeit sparen mit einer Vorlage",
          "text": "Sie haben schon eine Standardkonfiguration? Wählen Sie eine **Vorlage**: die 12 Geschenke werden auf einmal platziert, es bleiben nur die Bestände einzutragen. Sie können eigene Vorlagen speichern oder eine bestehende Kampagne duplizieren."
        },
        {
          "title": "Die Kundensegmentierung",
          "text": "In Schritt 2 legen Sie Ihre **Kategorien** an (zum Beispiel das Budget, mit seinen Optionen). Ihre Vertriebsmitarbeiter füllen sie später im Kontaktprofil aus, um jeden Kontakt einzuordnen."
        },
        {
          "title": "Ihre eigenen Felder",
          "text": "Fügen Sie den Kontaktprofilen **benutzerdefinierte Felder** hinzu: Text, Liste, Mehrfachauswahl, Datum … Sie erscheinen im CRM Ihres Teams."
        },
        {
          "title": "Das Gästeformular",
          "text": "In Schritt 3 legen Sie fest, was der Spieler vor dem Drehen ausfüllt. Vorname, Nachname und E-Mail werden immer abgefragt; fügen Sie Ihre **Fragen** hinzu, Pflicht oder nicht, mit Antworten zur Auswahl."
        },
        {
          "title": "Die Einstellungen",
          "text": "Schritt 4 legt die **Google-Bewertungen**, die **sozialen Netzwerke**, die Marketing-Einwilligung und die Belohnungs-E-Mail fest. Alles lässt sich später ändern."
        },
        {
          "title": "Die Kampagne erstellen",
          "text": "**Kampagne erstellen** speichert sie als Entwurf mit ihren 12 Geschenken. Es bleibt nur, sie zu **starten** (siehe die Anleitung zum Aktivieren und Pausieren)."
        }
      ]
    },
  },
};
