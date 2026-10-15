// Tutorial: the dashboard — how the campaign is going: stock, leads, chart, segments, top gifts.
const mod = (n) => () => document.querySelector(`.dash-grid > .dm:nth-child(${n})`);
const editBtn = () => [...document.querySelectorAll('.page-header button.btn-secondary')][2] || null;

export default {
  id: 'dashboard',
  icon: 'chart',
  device: 'desktop',
  admin: false,
  start: '/',
  steps: [
    { // 1
      async run(c) { await c.waitFor(mod(4)); await c.sleep(600); await c.point('.page-header', 2400); },
    },
    { // 2
      async run(c) { await c.point(mod(3), 2000); await c.point(mod(4), 1800); await c.point(mod(5), 2200); },
    },
    { // 3
      async run(c) { await c.point(mod(1), 1800); await c.point(mod(2), 2200); },
    },
    { // 4
      async run(c) { await c.point(mod(6), 3000); },
    },
    { // 5
      async run(c) { await c.point(mod(8), 2400); await c.point(mod(9), 3000); },
    },
    { // 6
      async run(c) {
        await c.select('.page-header select', 'CAM-2025-0031');
        await c.sleep(1400);
        await c.point(mod(1), 2400);
      },
    },
    { // 7
      async run(c) {
        await c.click(editBtn); await c.waitFor('.dash-bar'); await c.sleep(700);
        await c.point('.dash-bar', 2000); await c.point('.dm-tools', 2400);
      },
    },
    { // 8
      async run(c) {
        await c.click('.dash-bar .btn-primary'); await c.waitFor('.dash-pick'); await c.sleep(600);
        await c.point('.dash-tabs', 1600);
        await c.click(() => [...document.querySelectorAll('.dash-pick button')].find((b) => /^D[ée]partement/i.test(b.innerText)) || document.querySelector('.dash-pick button'));
        await c.waitFor(() => [...document.querySelectorAll('.modal-card div')].find((d) => d.innerText.trim().startsWith('✦')), 8000); await c.sleep(500);
        await c.point(() => document.querySelectorAll('.dash-tabs')[1], 2600);
        await c.click('.modal-card .btn-primary'); await c.sleep(1200);
        await c.point(() => [...document.querySelectorAll('.dash-grid > .dm')].pop(), 2600);
      },
    },
    { // 9
      async run(c) {
        await c.point('.dash-bar select', 1800);
        await c.click(() => [...document.querySelectorAll('.dash-bar button')].find((b) => b.innerText.includes('✦')));
        await c.waitFor('.modal-card textarea'); await c.sleep(500);
        await c.type('.modal-card textarea', 'Visiteurs, origine, rentabilité');
        await c.click('.modal-card .btn-primary'); await c.waitFor('.dash-ai-banner', 8000); await c.sleep(700);
        await c.point('.dash-ai-banner', 2600); await c.point('.dm-note', 2400);
      },
    },
    { // 10
      async run(c) {
        await c.select('.dash-bar select', 'b2b'); await c.sleep(1400);
        const profit = () => [...document.querySelectorAll('.dash-grid > .dm')].find((d) => d.querySelector('input[type=number]'));
        await c.waitFor(profit, 8000); await c.point(profit, 2200);
        await c.type(() => profit().querySelector('input[type=number]'), '12000'); await c.sleep(1400);
        await c.point(profit, 2400);
      },
    },
    { // 11
      async run(c) {
        await c.click(() => [...document.querySelectorAll('.dash-bar .btn-primary')].pop()); await c.sleep(1200);
        await c.point(() => [...document.querySelectorAll('.page-header button.btn-secondary')][1], 2800);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Le tableau de bord',
      summary: 'Où en est votre campagne : stock de cadeaux, contacts captés, courbe de distribution et cadeaux les plus gagnés. Puis composez le vôtre : modules, carte de France, rentabilité, IA et export PDF.',
      steps: [
        { title: 'La vue d’ensemble', text: 'Le **tableau de bord** suit la campagne **active**. En haut : son nom, son état, et un sélecteur pour consulter une autre campagne.' },
        { title: 'Le stock de cadeaux', text: '**Cadeaux restants**, **cadeaux distribués** et **avancement** de la campagne : vous voyez d’un coup d’œil s’il faut recharger le stand.' },
        { title: 'Vos contacts', text: '**Contacts captés** (chaque joueur), **contacts qualifiés** (ceux que votre équipe a notés) et **segmentés** : c’est le résultat commercial de l’événement.' },
        { title: 'La courbe', text: 'La **courbe de distribution** compare les cadeaux prévus, distribués et restants jour après jour (7, 30 ou 90 jours, ou tout).' },
        { title: 'Segments, cadeaux et activité', text: 'La répartition de vos contacts par **segment**, les **cadeaux les plus gagnés** avec leur avancement, et l’**activité récente** en direct.' },
        { title: 'Une autre campagne', text: 'Choisissez une campagne passée dans le sélecteur : les mêmes indicateurs s’affichent pour elle, pour comparer vos événements.' },
                { title: 'Personnaliser votre tableau', text: '**Personnaliser** ouvre l’édition. Chaque module a une poignée **⋮⋮** pour le **déplacer**, des boutons **− / +** pour sa **largeur** et une croix pour le **retirer**. Chaque campagne a **son propre tableau**, et rien n’est conservé tant que vous n’avez pas cliqué sur **Enregistrer**.' },
        { title: 'Ajouter un module', text: '**Ajouter un module** : un **graphique** sur n’importe quel **segment**, réponse du **formulaire** (âge, département…), les étoiles, les cadeaux ou les jours ; un **chiffre clé** ; ou une carte. SPARK **suggère la meilleure représentation** (✦) : camembert pour peu de catégories, barres sinon, histogramme pour un nombre, **carte de France** pour un département, courbe pour le temps.' },
        { title: 'Modèles et IA', text: '**Modèles** repart d’un tableau prêt à l’emploi (Salon B2B, grand public…). **✦ Proposer un dashboard** laisse l’IA suggérer des modules à partir de la **configuration** de la campagne (jamais de vos leads) : une phrase explique chaque module, vous ajustez, puis vous enregistrez.' },
        { title: 'La rentabilité', text: 'La carte **Rentabilité** compare le **coût de l’événement** que vous saisissez au **budget** noté par vos commerciaux : **CA prévisionnel** (avec pondération facultative selon les étoiles), **ROI**, coût par lead et par lead qualifié. Les chiffres se recalculent dès que vous changez le coût.' },
        { title: 'Enregistrer et exporter en PDF', text: '**Enregistrer** garde votre tableau pour cette campagne. **Exporter en PDF** en tire un **rapport soigné** (couverture, chiffres, graphiques, carte de France, rentabilité), sans aucune donnée nominative, prêt à envoyer à votre client.' },
      ],
    },
    en: {
      title: 'The dashboard',
      summary: 'How your campaign is doing: gift stock, captured contacts, distribution curve and the most-won gifts. Then build your own: modules, map of France, profitability, AI and PDF export.',
      steps: [
        { title: 'The overview', text: 'The **dashboard** follows the **active** campaign. At the top: its name, its status, and a selector to look at another campaign.' },
        { title: 'Gift stock', text: '**Gifts left**, **gifts handed out** and the campaign’s **progress**: you see at a glance whether the booth needs restocking.' },
        { title: 'Your contacts', text: '**Contacts captured** (every player), **qualified contacts** (those your team rated) and **segmented** ones: this is the commercial result of the event.' },
        { title: 'The curve', text: 'The **distribution curve** compares planned, distributed and remaining gifts day by day (7, 30 or 90 days, or all).' },
        { title: 'Segments, gifts and activity', text: 'The split of your contacts by **segment**, the **most-won gifts** with their progress, and the live **recent activity**.' },
        { title: 'Another campaign', text: 'Pick a past campaign in the selector: the same indicators are shown for it, so you can compare your events.' },
                { title: 'Customise your dashboard', text: '**Customise** opens the editor. Each module has a **⋮⋮** handle to **move** it, **− / +** buttons for its **width** and a cross to **remove** it. Each campaign has **its own dashboard**, and nothing is kept until you click **Save**.' },
        { title: 'Add a module', text: '**Add a module**: a **chart** on any **segment**, **form** answer (age, département…), the stars, the gifts or the days; a **key figure**; or a card. SPARK **suggests the best chart type** (✦): donut for a few categories, bars otherwise, histogram for a number, **map of France** for a département, line for time.' },
        { title: 'Templates and AI', text: '**Templates** starts from a ready-made dashboard (B2B trade show, consumer…). **✦ Suggest a dashboard** lets the AI propose modules from the campaign’s **configuration** (never your leads): one sentence explains each module, you adjust, then save.' },
        { title: 'Profitability', text: 'The **Profitability** card compares the **event cost** you enter with the **budget** your reps note: **forecast revenue** (with optional weighting by stars), **ROI**, cost per lead and per qualified lead. The figures update as soon as you change the cost.' },
        { title: 'Save and export as PDF', text: '**Save** keeps your dashboard for this campaign. **Export as PDF** turns it into a **polished report** (cover, figures, charts, map of France, profitability), with no personal data, ready to send to your client.' },
      ],
    },
    es: {
      "title": "El panel",
      "summary": "Cómo va su campaña: stock de regalos, contactos captados, curva de distribución y los regalos más ganados. Después componga el suyo: módulos, mapa de Francia, rentabilidad, IA y exportación a PDF.",
      "steps": [
        {
          "title": "La vista general",
          "text": "El **panel** sigue la campaña **activa**. Arriba: su nombre, su estado y un selector para consultar otra campaña."
        },
        {
          "title": "El stock de regalos",
          "text": "**Regalos restantes**, **regalos distribuidos** y **avance** de la campaña: de un vistazo sabe si hay que reponer el stand."
        },
        {
          "title": "Sus contactos",
          "text": "**Leads captados** (cada jugador), **leads cualificados** (los que su equipo ha valorado) y **segmentados**: es el resultado comercial del evento."
        },
        {
          "title": "La curva",
          "text": "La **curva de distribución** compara los regalos previstos, distribuidos y restantes día a día (7, 30 o 90 días, o todo)."
        },
        {
          "title": "Segmentos, regalos y actividad",
          "text": "El reparto de sus contactos por **segmento**, los **regalos más ganados** con su avance y la **actividad reciente** en directo."
        },
        {
          "title": "Otra campaña",
          "text": "Elija una campaña anterior en el selector: se muestran los mismos indicadores para ella, para comparar sus eventos."
        },
                {
          "title": "Personalizar su panel",
          "text": "**Personalizar** abre la edición. Cada módulo tiene un asa **⋮⋮** para **moverlo**, botones **− / +** para su **ancho** y una cruz para **quitarlo**. Cada campaña tiene **su propio panel**, y no se guarda nada hasta pulsar **Guardar**."
        },
        {
          "title": "Añadir un módulo",
          "text": "**Añadir un módulo**: un **gráfico** sobre cualquier **segmento**, respuesta del **formulario** (edad, departamento…), las estrellas, los regalos o los días; una **cifra clave**; o una tarjeta. SPARK **sugiere la mejor representación** (✦): gráfico circular para pocas categorías, barras si no, histograma para un número, **mapa de Francia** para un departamento, línea para el tiempo."
        },
        {
          "title": "Plantillas e IA",
          "text": "**Plantillas** parte de un panel listo para usar (feria B2B, gran público…). **✦ Proponer un panel** deja que la IA sugiera módulos a partir de la **configuración** de la campaña (nunca sus leads): una frase explica cada módulo, usted ajusta y guarda."
        },
        {
          "title": "La rentabilidad",
          "text": "La tarjeta **Rentabilidad** compara el **coste del evento** que usted introduce con el **presupuesto** que anotan sus comerciales: **ingresos previstos** (con ponderación opcional por estrellas), **ROI**, coste por lead y por lead cualificado. Las cifras se recalculan al cambiar el coste."
        },
        {
          "title": "Guardar y exportar a PDF",
          "text": "**Guardar** conserva su panel para esta campaña. **Exportar a PDF** genera un **informe cuidado** (portada, cifras, gráficos, mapa de Francia, rentabilidad), sin datos personales, listo para enviar a su cliente."
        }
      ]
    },
    de: {
      "title": "Die Übersicht",
      "summary": "Wie Ihre Kampagne läuft: Geschenkbestand, erfasste Kontakte, Verteilungskurve und die am häufigsten gewonnenen Geschenke. Dann stellen Sie Ihr eigenes zusammen: Module, Frankreich-Karte, Rentabilität, KI und PDF-Export.",
      "steps": [
        {
          "title": "Der Überblick",
          "text": "Die **Übersicht** folgt der **aktiven** Kampagne. Oben: ihr Name, ihr Status und eine Auswahl, um eine andere Kampagne anzusehen."
        },
        {
          "title": "Der Geschenkbestand",
          "text": "**Verbleibende Geschenke**, **verteilte Geschenke** und **Fortschritt** der Kampagne: auf einen Blick sehen Sie, ob der Stand aufgefüllt werden muss."
        },
        {
          "title": "Ihre Kontakte",
          "text": "**Erfasste Leads** (jeder Spieler), **qualifizierte Leads** (von Ihrem Team bewertet) und **segmentierte**: das ist das kommerzielle Ergebnis der Veranstaltung."
        },
        {
          "title": "Die Kurve",
          "text": "Die **Verteilungskurve** vergleicht geplante, verteilte und verbleibende Geschenke Tag für Tag (7, 30 oder 90 Tage, oder alles)."
        },
        {
          "title": "Segmente, Geschenke und Aktivität",
          "text": "Die Verteilung Ihrer Kontakte nach **Segment**, die **am häufigsten gewonnenen Geschenke** mit ihrem Fortschritt und die **letzten Aktivitäten** live."
        },
        {
          "title": "Eine andere Kampagne",
          "text": "Wählen Sie eine frühere Kampagne in der Auswahl: dieselben Kennzahlen werden für sie angezeigt, damit Sie Ihre Veranstaltungen vergleichen können."
        },
                {
          "title": "Das Dashboard anpassen",
          "text": "**Anpassen** öffnet den Editor. Jedes Modul hat einen Griff **⋮⋮** zum **Verschieben**, Tasten **− / +** für die **Breite** und ein Kreuz zum **Entfernen**. Jede Kampagne hat **ihr eigenes Dashboard**, und nichts wird gespeichert, bevor Sie auf **Speichern** klicken."
        },
        {
          "title": "Ein Modul hinzufügen",
          "text": "**Modul hinzufügen**: ein **Diagramm** zu jedem **Segment**, jeder **Formular**antwort (Alter, Département…), den Sternen, den Geschenken oder den Tagen; eine **Kennzahl**; oder eine Karte. SPARK **schlägt die beste Darstellung vor** (✦): Kreisdiagramm für wenige Kategorien, sonst Balken, Histogramm für eine Zahl, **Frankreich-Karte** für ein Département, Linie für die Zeit."
        },
        {
          "title": "Vorlagen und KI",
          "text": "**Vorlagen** starten von einem fertigen Dashboard (B2B-Messe, Publikum…). **✦ Dashboard vorschlagen** lässt die KI Module anhand der **Konfiguration** der Kampagne vorschlagen (nie Ihre Leads): ein Satz erklärt jedes Modul, Sie passen an und speichern."
        },
        {
          "title": "Die Rentabilität",
          "text": "Die Karte **Rentabilität** vergleicht die von Ihnen eingegebenen **Kosten der Veranstaltung** mit dem von Ihren Vertriebsmitarbeitern notierten **Budget**: **prognostizierter Umsatz** (mit optionaler Gewichtung nach Sternen), **ROI**, Kosten pro Lead und pro qualifiziertem Lead. Die Zahlen werden sofort neu berechnet."
        },
        {
          "title": "Speichern und als PDF exportieren",
          "text": "**Speichern** behält Ihr Dashboard für diese Kampagne. **Als PDF exportieren** erstellt daraus einen **hochwertigen Bericht** (Deckblatt, Kennzahlen, Diagramme, Frankreich-Karte, Rentabilität) ohne personenbezogene Daten, versandfertig an Ihren Kunden."
        }
      ]
    },
  },
};
