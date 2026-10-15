// Tutorial: the dashboard — how the campaign is going: stock, leads, chart, segments, top gifts.
const stats = (n) => () => document.querySelectorAll('.grid-stats-3')[n] || null;

export default {
  id: 'dashboard',
  icon: 'chart',
  device: 'desktop',
  admin: false,
  start: '/',
  steps: [
    { // 1
      async run(c) { await c.waitFor(stats(1)); await c.sleep(600); await c.point('.page-header', 2400); },
    },
    { // 2
      async run(c) { await c.point(stats(1), 2800); },
    },
    { // 3
      async run(c) { await c.point(stats(0), 2800); },
    },
    { // 4
      async run(c) { await c.point(() => document.querySelectorAll('.dash-row-wide')[0], 3000); },
    },
    { // 5
      async run(c) { await c.point('main > div > .card.mt-card', 2400); await c.point(() => document.querySelectorAll('.dash-row-wide')[1], 3000); },
    },
    { // 6
      async run(c) {
        await c.select('.page-header select', 'CAM-2025-0031');
        await c.sleep(1400);
        await c.point(stats(1), 2400);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Le tableau de bord',
      summary: 'Où en est votre campagne : stock de cadeaux, contacts captés, courbe de distribution et cadeaux les plus gagnés.',
      steps: [
        { title: 'La vue d’ensemble', text: 'Le **tableau de bord** suit la campagne **active**. En haut : son nom, son état, et un sélecteur pour consulter une autre campagne.' },
        { title: 'Le stock de cadeaux', text: '**Cadeaux restants**, **cadeaux distribués** et **avancement** de la campagne : vous voyez d’un coup d’œil s’il faut recharger le stand.' },
        { title: 'Vos contacts', text: '**Contacts captés** (chaque joueur), **contacts qualifiés** (ceux que votre équipe a notés) et **segmentés** : c’est le résultat commercial de l’événement.' },
        { title: 'La courbe', text: 'La **courbe de distribution** compare les cadeaux prévus, distribués et restants jour après jour (7, 30 ou 90 jours, ou tout).' },
        { title: 'Segments, cadeaux et activité', text: 'La répartition de vos contacts par **segment**, les **cadeaux les plus gagnés** avec leur avancement, et l’**activité récente** en direct.' },
        { title: 'Une autre campagne', text: 'Choisissez une campagne passée dans le sélecteur : les mêmes indicateurs s’affichent pour elle, pour comparer vos événements.' },
      ],
    },
    en: {
      title: 'The dashboard',
      summary: 'How your campaign is doing: gift stock, captured contacts, distribution curve and the most-won gifts.',
      steps: [
        { title: 'The overview', text: 'The **dashboard** follows the **active** campaign. At the top: its name, its status, and a selector to look at another campaign.' },
        { title: 'Gift stock', text: '**Gifts left**, **gifts handed out** and the campaign’s **progress**: you see at a glance whether the booth needs restocking.' },
        { title: 'Your contacts', text: '**Contacts captured** (every player), **qualified contacts** (those your team rated) and **segmented** ones: this is the commercial result of the event.' },
        { title: 'The curve', text: 'The **distribution curve** compares planned, distributed and remaining gifts day by day (7, 30 or 90 days, or all).' },
        { title: 'Segments, gifts and activity', text: 'The split of your contacts by **segment**, the **most-won gifts** with their progress, and the live **recent activity**.' },
        { title: 'Another campaign', text: 'Pick a past campaign in the selector: the same indicators are shown for it, so you can compare your events.' },
      ],
    },
    es: {
      "title": "El panel",
      "summary": "Cómo va su campaña: stock de regalos, contactos captados, curva de distribución y los regalos más ganados.",
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
        }
      ]
    },
    de: {
      "title": "Die Übersicht",
      "summary": "Wie Ihre Kampagne läuft: Geschenkbestand, erfasste Kontakte, Verteilungskurve und die am häufigsten gewonnenen Geschenke.",
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
        }
      ]
    },
  },
};
