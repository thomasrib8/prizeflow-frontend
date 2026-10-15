// Tutorial (administrators): the wheel park — the rental fleet, assigning a wheel to a client, ending a rental.
const rowOf = (serial) => () => [...document.querySelectorAll('table.data-table tbody tr')].find((r) => r.innerText.includes(serial)) || null;
const lastBtn = () => [...document.querySelectorAll('.modal-card button')].pop();

export default {
  id: 'park',
  icon: 'box',
  device: 'desktop',
  admin: true,
  start: '/park',
  steps: [
    { // 1
      async run(c) { await c.waitFor('table.data-table'); await c.sleep(600); await c.point('.grid-stats', 2200); await c.point('table.data-table', 2800); },
    },
    { // 2
      async run(c) { await c.click(rowOf('PF260000153')); await c.waitFor('.modal-card select'); await c.sleep(900); await c.point('.modal-card', 2600); },
    },
    { // 3
      async run(c) {
        await c.select('.modal-card select', 'usr_c3');
        await c.sleep(500);
        await c.click(() => [...document.querySelectorAll('.modal-card button')].find((b) => /btn-primary/.test(b.className) && !b.disabled));
        await c.sleep(1400);
        await c.point('.modal-card', 2200);
      },
    },
    { // 4
      async run(c) { await c.point('.modal-card div[style*="display: grid"]', 2800); await c.click(lastBtn); await c.sleep(500); },
    },
    { // 5
      async run(c) {
        await c.click(rowOf('PF260000152')); await c.waitFor('.modal-card select'); await c.sleep(800);
        const endBtn = () => [...document.querySelectorAll('.modal-card button')].filter((b) => /btn-ghost/.test(b.className)).slice(-3)[0] || null;
        await c.point(endBtn, 1800);
        await c.click(endBtn);
        await c.waitFor('.wh-stars'); await c.sleep(900); await c.point('.wh-stars', 1800);
        await c.click('.wh-stars button:nth-child(4)'); await c.sleep(400);
        await c.point('.wh-photos', 1600);
        const yn = () => document.querySelectorAll('.wh-yn');
        await c.click(() => yn()[0].children[0]); await c.sleep(300);
        await c.click(() => yn()[1].children[0]); await c.sleep(500);
        await c.click('.wh-btn.danger');
        await c.sleep(1400); await c.point('.modal-card', 2200);
        await c.click(lastBtn); await c.sleep(500);
        await c.point(rowOf('PF260000152'), 2600);
      },
    },
    { // 6
      async run(c) {
        await c.click('.page-header button');
        await c.waitFor('.modal-card'); await c.sleep(800); await c.point('.modal-card', 2400);
        await c.click(() => [...document.querySelectorAll('.modal-card button')].find((b) => /btn-primary/.test(b.className)));
        await c.waitFor('#wheel-label'); await c.sleep(900); await c.point('#wheel-label', 3200);
        await c.click(() => [...document.querySelectorAll('.modal-card button')].find((b) => /btn-ghost/.test(b.className))); await c.sleep(600);
        await c.point(rowOf('PF2600'), 1800);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Le parc hardware : suivre et louer vos roues',
      summary: 'Toutes vos roues et leurs boîtiers : à qui elles sont louées, leur état, l’historique, l’attribution et la fin de location.',
      steps: [
        { title: 'Votre parc', text: 'Le menu **Parc hardware** (administrateurs) liste chaque roue : **numéro de série**, état (**disponible**, **louée**, **maintenance**), **client**, connexion en direct et **boîtier** (son nom vient du numéro de série et ne change pas d’une location à l’autre).' },
        { title: 'La fiche d’une roue', text: 'Cliquez une ligne : identité complète (modèle, série, clé de sécurité), notes libres, mise en maintenance et **historique des locations**.' },
        { title: 'Attribuer à un client', text: 'Choisissez le client puis **Attribuer** : la roue passe en « louée ». Si le client avait déjà une roue elle retourne au dépôt ; si la roue était chez quelqu’un d’autre, SPARK vous demande de confirmer et lui retire.' },
        { title: 'L’historique', text: 'Chaque attribution est conservée avec ses dates : vous savez toujours **qui a eu quelle roue et quand**.' },
        { title: 'Fin de location', text: '**Fin de location** ouvre le **constat de retour** : état visuel de **0 à 3 étoiles**, **photos**, la roue fonctionne-t-elle, le pack est-il complet. Une fois validé, la roue retourne au dépôt (ou en **maintenance** si elle est abîmée, ne fonctionne pas ou si le pack est incomplet). Le client **garde son compte, ses campagnes et son CRM**, mais son boîtier reçoit l’**ordre de s’effacer** dès qu’il rejoint internet.' },
        { title: 'Ajouter une roue', text: '**Ajouter une roue** crée son identité (génération automatique, ou saisie de celle déjà écrite dans le Raspberry Pi) puis affiche son **étiquette 10 × 5 cm** à imprimer : le QR code ouvre la page de la roue, pour déclarer vite une fin de location ou une réattribution depuis un téléphone (administrateurs uniquement).' },
      ],
    },
    en: {
      title: 'The hardware park: track and rent your wheels',
      summary: 'All your wheels and their boxes: who rents them, their status, history, assignment and end of rental.',
      steps: [
        { title: 'Your park', text: 'The **Hardware park** menu (administrators) lists every wheel: **serial number**, status (**available**, **rented**, **maintenance**), **client**, live connection and **box** (its name comes from the serial number and does not change between rentals).' },
        { title: 'A wheel’s record', text: 'Click a row: full identity (model, serial, security key), free notes, maintenance switch and **rental history**.' },
        { title: 'Assign to a client', text: 'Pick the client then **Assign**: the wheel becomes “rented”. If the client already had a wheel it goes back to the depot; if the wheel was with someone else, SPARK asks you to confirm and takes it from them.' },
        { title: 'The history', text: 'Every assignment is kept with its dates: you always know **who had which wheel and when**.' },
        { title: 'End of rental', text: '**End of rental** opens the **return inspection**: visual condition from **0 to 3 stars**, **photos**, does the wheel work, is the pack complete. Once confirmed, the wheel goes back to the depot (or to **maintenance** if it is damaged, not working or the pack is incomplete). The client **keeps their account, campaigns and CRM**, but their box gets the **order to erase itself** as soon as it reaches the internet.' },
        { title: 'Add a wheel', text: '**Add a wheel** creates its identity (generated automatically, or typed from what is already written in the Raspberry Pi) then shows its **10 × 5 cm label** to print: the QR code opens the wheel’s page, to quickly record an end of rental or a reassignment from a phone (administrators only).' },
      ],
    },
    es: {
      "title": "El parque de hardware: seguir y alquilar sus ruedas",
      "summary": "Todas sus ruedas y sus cajas: a quién están alquiladas, su estado, el historial, la asignación y el fin del alquiler.",
      "steps": [
        {
          "title": "Su parque",
          "text": "El menú **Parque de hardware** (administradores) enumera cada rueda: **número de serie**, estado (**disponible**, **alquilada**, **mantenimiento**), **cliente**, conexión en directo y **caja** (su nombre viene del número de serie y no cambia de un alquiler a otro)."
        },
        {
          "title": "La ficha de una rueda",
          "text": "Haga clic en una fila: identidad completa (modelo, serie, clave de seguridad), notas libres, paso a mantenimiento e **historial de alquileres**."
        },
        {
          "title": "Asignar a un cliente",
          "text": "Elija el cliente y luego **Asignar**: la rueda pasa a «alquilada». Si el cliente ya tenía una rueda, esta vuelve al almacén; si la rueda estaba con otra persona, SPARK le pide confirmar y se la retira."
        },
        {
          "title": "El historial",
          "text": "Cada asignación se conserva con sus fechas: siempre sabe **quién tuvo qué rueda y cuándo**."
        },
        {
          "title": "Fin del alquiler",
          "text": "**Fin del alquiler** abre el **informe de devolución**: estado visual de **0 a 3 estrellas**, **fotos**, si la rueda funciona y si el pack está completo. Una vez validado, la rueda vuelve al almacén (o a **mantenimiento** si está dañada, no funciona o el pack está incompleto). El cliente **conserva su cuenta, sus campañas y su CRM**, pero su caja recibe la **orden de borrarse** en cuanto llegue a internet."
        },
        {
          "title": "Añadir una rueda",
          "text": "**Añadir una rueda** crea su identidad (generación automática, o la ya escrita en la Raspberry Pi) y muestra su **etiqueta de 10 × 5 cm** para imprimir: el código QR abre la página de la rueda, para registrar rápido un fin de alquiler o una reasignación desde un teléfono (solo administradores)."
        }
      ]
    },
    de: {
      "title": "Der Hardware-Park: Ihre Räder verfolgen und vermieten",
      "summary": "Alle Ihre Räder und ihre Boxen: an wen sie vermietet sind, ihr Status, der Verlauf, die Zuweisung und das Mietende.",
      "steps": [
        {
          "title": "Ihr Park",
          "text": "Das Menü **Hardware-Park** (Administratoren) listet jedes Rad: **Seriennummer**, Status (**verfügbar**, **vermietet**, **Wartung**), **Kunde**, Live-Verbindung und **Box** (ihr Name stammt von der Seriennummer und ändert sich von einer Miete zur nächsten nicht)."
        },
        {
          "title": "Die Seite eines Rads",
          "text": "Klicken Sie auf eine Zeile: vollständige Identität (Modell, Serie, Sicherheitsschlüssel), freie Notizen, Wartungsschalter und **Mietverlauf**."
        },
        {
          "title": "Einem Kunden zuweisen",
          "text": "Wählen Sie den Kunden und dann **Zuweisen**: das Rad wird „vermietet“. Hatte der Kunde schon ein Rad, geht es zurück ins Lager; war das Rad bei jemand anderem, bittet SPARK um Bestätigung und entzieht es ihm."
        },
        {
          "title": "Der Verlauf",
          "text": "Jede Zuweisung wird mit ihren Daten aufbewahrt: Sie wissen immer, **wer welches Rad wann hatte**."
        },
        {
          "title": "Mietende",
          "text": "**Mietende** öffnet das **Rückgabeprotokoll**: optischer Zustand von **0 bis 3 Sternen**, **Fotos**, funktioniert das Rad, ist das Paket vollständig. Nach der Bestätigung geht das Rad zurück ins Lager (oder in die **Wartung**, wenn es beschädigt ist, nicht funktioniert oder das Paket unvollständig ist). Der Kunde **behält sein Konto, seine Kampagnen und sein CRM**, aber seine Box erhält den **Befehl, sich zu löschen**, sobald sie das Internet erreicht."
        },
        {
          "title": "Ein Rad hinzufügen",
          "text": "**Rad hinzufügen** erstellt seine Identität (automatisch erzeugt oder die bereits im Raspberry Pi stehende eingegeben) und zeigt sein **Etikett 10 × 5 cm** zum Drucken: der QR-Code öffnet die Seite des Rads, um ein Mietende oder eine Neuzuweisung schnell am Telefon zu erfassen (nur Administratoren)."
        }
      ]
    },
  },
};
