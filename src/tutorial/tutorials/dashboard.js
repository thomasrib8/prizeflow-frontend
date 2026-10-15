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
        await c.point('.dash-bar', 2200); await c.point('.dm-tools', 2200);
        await c.click('.dash-bar .btn-primary'); await c.waitFor('.dash-pick'); await c.sleep(600);
        await c.point('.dash-tabs', 1800); await c.point('.dash-pick', 2400);
        await c.click('.modal-card .btn-ghost'); await c.sleep(500);
        await c.click('.dash-bar .btn-ghost'); await c.sleep(500);
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
        { title: 'Personnaliser son tableau de bord', text: '**Personnaliser** ouvre l’édition : **déplacez** les modules (poignée ⋮⋮), changez leur **largeur** (− / +) ou **retirez**-les. **Ajouter un module** propose un **graphique** sur n’importe quel segment ou réponse du formulaire, un **chiffre clé** ou une carte, et SPARK **suggère la meilleure représentation** (camembert, histogramme, **carte de France** pour un département…) ; **Modèles** repart d’un tableau prêt à l’emploi (Salon B2B, grand public…) ; **✦ Proposer un dashboard** laisse l’IA suggérer les modules à partir de la configuration de la campagne (jamais de vos leads). La carte **Rentabilité** compare le coût de l’événement au **budget** noté par vos commerciaux pour calculer le **CA prévisionnel** et le **ROI**. Rien n’est conservé avant **Enregistrer**, et chaque campagne garde son propre tableau. **Exporter en PDF** en tire un rapport soigné, prêt à envoyer.' }
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
        { title: 'Customise your dashboard', text: '**Customise** opens the editor: **drag** modules (⋮⋮ handle), change their **width** (− / +) or **remove** them. **Add a module** offers a **chart** on any segment or form answer, a **key figure** or a card, and SPARK **suggests the best chart type** (donut, histogram, **map of France** for a département…); **Templates** starts from a ready-made dashboard (B2B trade show, consumer…); **✦ Suggest a dashboard** lets the AI propose modules from the campaign’s configuration (never your leads). The **Profitability** card compares the event cost with the **budget** your reps note, to work out the **forecast revenue** and **ROI**. Nothing is kept until you click **Save**, and each campaign keeps its own dashboard. **Export as PDF** turns it into a polished report, ready to send.' }
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
        },
        {
          "title": "Personalizar su panel",
          "text": "**Personalizar** abre la edición: **mueva** los módulos (asa ⋮⋮), cambie su **ancho** (− / +) o **quítelos**. **Añadir un módulo** ofrece un **gráfico** de cualquier segmento o respuesta del formulario, una **cifra clave** o una tarjeta, y SPARK **sugiere la mejor representación** (gráfico circular, histograma, **mapa de Francia** para un departamento…); **Plantillas** parte de un panel listo para usar (feria B2B, gran público…); **✦ Proponer un panel** deja que la IA sugiera módulos a partir de la configuración de la campaña (nunca sus leads). La tarjeta **Rentabilidad** compara el coste del evento con el **presupuesto** que anotan sus comerciales para calcular los **ingresos previstos** y el **ROI**. No se guarda nada hasta pulsar **Guardar**, y cada campaña conserva su propio panel. **Exportar a PDF** genera un informe cuidado, listo para enviar."
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
        },
        {
          "title": "Das Dashboard anpassen",
          "text": "**Anpassen** öffnet den Editor: **Verschieben** Sie Module (Griff ⋮⋮), ändern Sie ihre **Breite** (− / +) oder **entfernen** Sie sie. **Modul hinzufügen** bietet ein **Diagramm** zu jedem Segment oder jeder Formularantwort, eine **Kennzahl** oder eine Karte, und SPARK **schlägt die beste Darstellung vor** (Kreisdiagramm, Histogramm, **Frankreich-Karte** für ein Département…); **Vorlagen** starten von einem fertigen Dashboard (B2B-Messe, Publikum…); **✦ Dashboard vorschlagen** lässt die KI Module anhand der Konfiguration der Kampagne vorschlagen (nie Ihre Leads). Die Karte **Rentabilität** vergleicht die Kosten der Veranstaltung mit dem von Ihren Vertriebsmitarbeitern notierten **Budget**, um den **prognostizierten Umsatz** und den **ROI** zu berechnen. Nichts wird gespeichert, bevor Sie auf **Speichern** klicken, und jede Kampagne behält ihr eigenes Dashboard. **Als PDF exportieren** erstellt daraus einen hochwertigen Bericht, versandfertig."
        }
      ]
    },
  },
};
