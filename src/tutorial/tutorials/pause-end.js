// Tutorial: the life of a campaign — start, pause, resume, "Others" menu, end.
export default {
  id: 'campaign-lifecycle',
  icon: 'play',
  device: 'desktop',
  admin: false,
  start: '/campaigns',
  steps: [
    { // 1
      async run(c) { await c.point('.cp-list', 1800); },
    },
    { // 2
      async run(c) { await c.click('.cp-row'); await c.waitFor('.camp-actions .btn-success'); await c.sleep(600); },
    },
    { // 3
      async run(c) { await c.click('.camp-actions .btn-success'); await c.waitFor('.camp-actions .btn-warning'); await c.sleep(500); },
    },
    { // 4
      async run(c) {
        await c.point('.camp-actions .btn-warning', 1400);
        await c.point('.camp-actions .btn-danger', 1400);
        await c.point('.camp-actions .btn-primary', 1400);
      },
    },
    { // 5
      async run(c) { await c.click('.camp-actions .btn-warning'); await c.waitFor('.camp-actions .btn-success'); await c.sleep(900); },
    },
    { // 6
      async run(c) { await c.click('.camp-actions .btn-success'); await c.waitFor('.camp-actions .btn-warning'); await c.sleep(600); },
    },
    { // 7
      async run(c) {
        await c.click('.camp-more > button');
        await c.waitFor('.camp-menu');
        await c.point('.camp-menu', 2600);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        await c.sleep(400);
      },
    },
    { // 8
      async run(c) { await c.click('.camp-actions .btn-danger'); await c.waitFor('.camp-actions .btn-secondary'); await c.sleep(900); },
    },
  ],
  texts: {
    fr: {
      title: 'Activer, mettre en pause et terminer une campagne',
      summary: 'Le cycle de vie d’une campagne : du brouillon à la fin de l’événement.',
      steps: [
        { title: 'Votre liste de campagnes', text: 'La page **Campagnes** regroupe toutes vos campagnes avec leur statut : brouillon, active, en pause, terminée ou archivée. Une seule campagne peut être active à la fois.' },
        { title: 'Ouvrir la campagne', text: 'Cliquez sur **Voir** pour ouvrir la fiche d’une campagne : ses cadeaux, leur stock et leur avancement.' },
        { title: 'Démarrer la campagne', text: 'Une campagne en brouillon n’est pas visible des joueurs. Le bouton vert **Démarrer** la rend active : le QR code invité fonctionne et la roue peut tourner. Au premier démarrage, SPARK fixe l’ordre de distribution des cadeaux.' },
        { title: 'Les boutons d’une campagne active', text: '**Pause** (orange), **Terminer la campagne** (rouge) et **Aller à Lancer** (bleu) pour piloter l’événement. Si une autre campagne est déjà active, SPARK vous demande de la terminer ou de la mettre en pause d’abord.' },
        { title: 'Mettre en pause', text: 'En pause, plus personne ne peut jouer, mais rien n’est perdu : les stocks et l’ordre des cadeaux restent intacts. Pratique pour une pause déjeuner ou un changement de stand.' },
        { title: 'Reprendre', text: 'Le bouton vert **Reprendre** relance la campagne exactement là où elle s’était arrêtée.' },
        { title: 'Le menu « Autres »', text: 'Les actions moins fréquentes sont rangées dans **Autres** : modifier les cadeaux, la segmentation et le formulaire, les paramètres, dupliquer la campagne, exporter la distribution des cadeaux (CSV), télécharger le rapport PDF, et supprimer une campagne qui n’est pas active.' },
        { title: 'Terminer la campagne', text: 'À la fin de l’événement, **Terminer la campagne** la clôture : plus aucun tirage. Vos prospects restent dans le CRM, vous pouvez exporter les résultats, et archiver la campagne ensuite.' },
      ],
    },
    en: {
      title: 'Start, pause and end a campaign',
      summary: 'The life of a campaign: from draft to the end of the event.',
      steps: [
        { title: 'Your campaign list', text: 'The **Campaigns** page lists all your campaigns with their status: draft, active, paused, completed or archived. Only one campaign can be active at a time.' },
        { title: 'Open the campaign', text: 'Click **View** to open a campaign: its gifts, their stock and how far they have been given out.' },
        { title: 'Start the campaign', text: 'A draft campaign is not visible to players. The green **Start** button makes it active: the guest QR code works and the wheel can spin. On the first start, SPARK fixes the order in which gifts will be given.' },
        { title: 'The buttons of an active campaign', text: '**Pause** (orange), **End the campaign** (red) and **Go to Launch** (blue) to run the event. If another campaign is already active, SPARK asks you to end or pause it first.' },
        { title: 'Pause', text: 'While paused, nobody can play, but nothing is lost: stock and gift order stay intact. Handy for a lunch break or a change of stand.' },
        { title: 'Resume', text: 'The green **Resume** button restarts the campaign exactly where it stopped.' },
        { title: 'The “More” menu', text: 'Less frequent actions are tucked into **More**: edit gifts, segmentation and form, settings, duplicate the campaign, export the gift distribution (CSV), download the PDF report, and delete a campaign that is not active.' },
        { title: 'End the campaign', text: 'At the end of the event, **End the campaign** closes it: no more spins. Your prospects stay in the CRM, you can export the results, and archive the campaign afterwards.' },
      ],
    },
    es: {
      "title": "Activar, pausar y terminar una campaña",
      "summary": "El ciclo de vida de una campaña: del borrador al final del evento.",
      "steps": [
        {
          "title": "Su lista de campañas",
          "text": "La página **Campañas** reúne todas sus campañas con su estado: borrador, activa, en pausa, terminada o archivada. Solo una campaña puede estar activa a la vez."
        },
        {
          "title": "Abrir la campaña",
          "text": "Haga clic en **Ver** para abrir la ficha de una campaña: sus regalos, su stock y su avance."
        },
        {
          "title": "Iniciar la campaña",
          "text": "Una campaña en borrador no es visible para los jugadores. El botón verde **Iniciar** la activa: el QR del invitado funciona y la rueda puede girar. En el primer inicio, SPARK fija el orden de distribución de los regalos."
        },
        {
          "title": "Los botones de una campaña activa",
          "text": "**Pausa** (naranja), **Terminar la campaña** (rojo) e **Ir a Lanzar** (azul) para dirigir el evento. Si ya hay otra campaña activa, SPARK le pide terminarla o ponerla en pausa primero."
        },
        {
          "title": "Poner en pausa",
          "text": "En pausa nadie puede jugar, pero no se pierde nada: los stocks y el orden de los regalos quedan intactos. Útil para una pausa para comer o un cambio de stand."
        },
        {
          "title": "Reanudar",
          "text": "El botón verde **Reanudar** relanza la campaña exactamente donde se detuvo."
        },
        {
          "title": "El menú «Otros»",
          "text": "Las acciones menos frecuentes están en **Otros**: modificar los regalos, la segmentación y el formulario, los ajustes, duplicar la campaña, exportar la distribución de regalos (CSV), descargar el informe PDF y eliminar una campaña que no está activa."
        },
        {
          "title": "Terminar la campaña",
          "text": "Al final del evento, **Terminar la campaña** la cierra: ya no hay más tiradas. Sus prospectos permanecen en el CRM, puede exportar los resultados y archivar la campaña después."
        }
      ]
    },
    de: {
      "title": "Eine Kampagne aktivieren, pausieren und beenden",
      "summary": "Der Lebenszyklus einer Kampagne: vom Entwurf bis zum Ende der Veranstaltung.",
      "steps": [
        {
          "title": "Ihre Kampagnenliste",
          "text": "Die Seite **Kampagnen** vereint alle Ihre Kampagnen mit ihrem Status: Entwurf, aktiv, pausiert, beendet oder archiviert. Nur eine Kampagne kann gleichzeitig aktiv sein."
        },
        {
          "title": "Die Kampagne öffnen",
          "text": "Klicken Sie auf **Ansehen**, um die Seite einer Kampagne zu öffnen: ihre Geschenke, ihr Bestand und ihr Fortschritt."
        },
        {
          "title": "Die Kampagne starten",
          "text": "Eine Entwurfskampagne ist für Spieler nicht sichtbar. Die grüne Schaltfläche **Starten** aktiviert sie: der Gäste-QR-Code funktioniert und das Rad kann sich drehen. Beim ersten Start legt SPARK die Reihenfolge der Geschenkvergabe fest."
        },
        {
          "title": "Die Schaltflächen einer aktiven Kampagne",
          "text": "**Pause** (orange), **Kampagne beenden** (rot) und **Zu Start** (blau), um die Veranstaltung zu steuern. Ist bereits eine andere Kampagne aktiv, bittet SPARK Sie, sie zuerst zu beenden oder zu pausieren."
        },
        {
          "title": "Pausieren",
          "text": "Während der Pause kann niemand spielen, aber nichts geht verloren: Bestände und Geschenkreihenfolge bleiben erhalten. Praktisch für eine Mittagspause oder einen Standwechsel."
        },
        {
          "title": "Fortsetzen",
          "text": "Die grüne Schaltfläche **Fortsetzen** startet die Kampagne genau dort neu, wo sie angehalten wurde."
        },
        {
          "title": "Das Menü „Weitere“",
          "text": "Seltener genutzte Aktionen sind unter **Weitere** zusammengefasst: Geschenke, Segmentierung und Formular bearbeiten, Einstellungen, Kampagne duplizieren, Geschenkverteilung exportieren (CSV), PDF-Bericht herunterladen und eine nicht aktive Kampagne löschen."
        },
        {
          "title": "Die Kampagne beenden",
          "text": "Am Ende der Veranstaltung schließt **Kampagne beenden** sie ab: keine Ziehungen mehr. Ihre Interessenten bleiben im CRM, Sie können die Ergebnisse exportieren und die Kampagne danach archivieren."
        }
      ]
    },
  },
};
