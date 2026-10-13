// Tutorial: the life of a campaign — start, pause, resume, "Others" menu, end.
export default {
  id: 'campaign-lifecycle',
  icon: 'play',
  device: 'desktop',
  admin: false,
  start: '/campaigns',
  steps: [
    { // 1
      async run(c) { await c.point('table.data-table', 1800); },
    },
    { // 2
      async run(c) { await c.click('tbody tr:first-child a.btn'); await c.waitFor('.camp-actions .btn-success'); await c.sleep(600); },
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
  },
};
