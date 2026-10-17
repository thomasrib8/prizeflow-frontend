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
      async run(c) {
        await c.click('.modal-card .tab:last-child'); await c.sleep(900);
        await c.point('.modal-card', 3000);
        await c.click(lastBtn); await c.sleep(500);
      },
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
        await c.click('.page-header .btn-primary');
        await c.waitFor('.sw-card'); await c.sleep(800); await c.point('.sw-steps', 2400);
        const go = () => { const b = document.querySelectorAll('.sw-foot button'); return b.length ? b[b.length - 1] : null; };
        const tickAll = async () => { document.querySelectorAll('.sw-body input[type=checkbox]').forEach((x) => { if (!x.checked) x.click(); }); await c.sleep(500); };
        await c.click(go); await c.waitFor('.sw-body input[type=password]', 8000); await c.sleep(500); await c.point('.sw-wifi', 2200);
        await c.click(go); await c.waitFor('.sw-row input[type=checkbox]', 6000); await c.sleep(500); await c.point('.sw-body', 2400); await tickAll(); // TP-Link
        await c.click(go); await c.waitFor('.sw-code', 8000); await c.sleep(500); await c.click(go); await c.sleep(600); // wheel block
        await c.waitFor('.sw-row input[type=checkbox]', 6000); await c.point('.sw-body', 2200); await tickAll(); // TP-Link · wheel
        await c.click(go); await c.waitFor('.sw-body button', 6000); await c.sleep(600);
        await c.click('.sw-body button.btn-primary, .sw-body button.btn-secondary'); await c.waitFor('.sw-codebig', 8000); await c.point('.sw-codebig', 2200);
        c.demo('box', 'activated'); await c.waitFor('.sw-status.ok', 12000); await c.sleep(600); await c.point('.sw-body', 2200); await tickAll();
        await c.click(go); await c.waitFor('.sw-check', 6000); await c.sleep(500); await tickAll(); await c.point('.sw-body', 2400);
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
        { title: 'L’historique', text: 'L’onglet **Historique machine** garde chaque location avec ses dates : **qui a eu la roue**, combien de temps, comment elle s’est terminée, et le **constat de retour** (étoiles, photos, pack) rempli à chaque retour.' },
        { title: 'Fin de location', text: '**Fin de location** ouvre le **constat de retour** : état visuel de **0 à 3 étoiles**, **photos**, la roue fonctionne-t-elle, le pack est-il complet. Une fois validé, la roue retourne au dépôt (ou en **maintenance** si elle est abîmée, ne fonctionne pas ou si le pack est incomplet). Le client **garde son compte, ses campagnes et son CRM**, mais son boîtier reçoit l’**ordre de s’effacer** dès qu’il rejoint internet.' },
        { title: 'Préparer un pack', text: '**Préparer un pack** (une seule fois par pack) : identité de la roue, **mot de passe Spark-Local fixe**, bloc de configuration de la roue, **activation du boîtier**, puis **des écrans simples pour le TP-Link** (allumer le routeur, connecter la roue puis le boîtier à son Wi-Fi) à cocher au fur et à mesure. Le pack devient alors **prêt** et peut être attribué à n’importe quel client, sans rien refaire sur le matériel. L’**étiquette 10 × 5 cm** de la roue reste imprimable depuis la liste.' },
      ],
    },
    en: {
      title: 'The hardware park: track and rent your wheels',
      summary: 'All your wheels and their boxes: who rents them, their status, history, assignment and end of rental.',
      steps: [
        { title: 'Your park', text: 'The **Hardware park** menu (administrators) lists every wheel: **serial number**, status (**available**, **rented**, **maintenance**), **client**, live connection and **box** (its name comes from the serial number and does not change between rentals).' },
        { title: 'A wheel’s record', text: 'Click a row: full identity (model, serial, security key), free notes, maintenance switch and **rental history**.' },
        { title: 'Assign to a client', text: 'Pick the client then **Assign**: the wheel becomes “rented”. If the client already had a wheel it goes back to the depot; if the wheel was with someone else, SPARK asks you to confirm and takes it from them.' },
        { title: 'The history', text: 'The **Machine history** tab keeps every rental with its dates: **who had the wheel**, for how long, how it ended, and the **return inspection** (stars, photos, pack) filled in at each return.' },
        { title: 'End of rental', text: '**End of rental** opens the **return inspection**: visual condition from **0 to 3 stars**, **photos**, does the wheel work, is the pack complete. Once confirmed, the wheel goes back to the depot (or to **maintenance** if it is damaged, not working or the pack is incomplete). The client **keeps their account, campaigns and CRM**, but their box gets the **order to erase itself** as soon as it reaches the internet.' },
        { title: 'Prepare a pack', text: '**Prepare a pack** (once per pack): the wheel’s identity, a **fixed Spark-Local password**, the wheel’s configuration block, **box activation**, then **simple TP-Link screens** (switch the router on, connect the wheel and then the box to its Wi-Fi) ticked off as you go. The pack is then **ready** and can be assigned to any client, with nothing to redo on the hardware. The wheel’s **10 × 5 cm label** can still be printed from the list.' },
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
          "text": "La pestaña **Historial de la máquina** conserva cada alquiler con sus fechas: **quién tuvo la rueda**, cuánto tiempo, cómo terminó y el **informe de devolución** (estrellas, fotos, pack) rellenado en cada devolución."
        },
        {
          "title": "Fin del alquiler",
          "text": "**Fin del alquiler** abre el **informe de devolución**: estado visual de **0 a 3 estrellas**, **fotos**, si la rueda funciona y si el pack está completo. Una vez validado, la rueda vuelve al almacén (o a **mantenimiento** si está dañada, no funciona o el pack está incompleto). El cliente **conserva su cuenta, sus campañas y su CRM**, pero su caja recibe la **orden de borrarse** en cuanto llegue a internet."
        },
        {
          "title": "Preparar un pack",
          "text": "**Preparar un pack** (una sola vez por pack): identidad de la rueda, **contraseña Spark-Local fija**, bloque de configuración de la rueda, **activación de la caja** y **pantallas sencillas para el TP-Link** (encender el router, conectar la rueda y luego la caja a su Wi-Fi) que se marcan sobre la marcha. El pack queda **listo** y se puede asignar a cualquier cliente sin rehacer nada en el equipo. La **etiqueta de 10 × 5 cm** de la rueda se sigue imprimiendo desde la lista."
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
          "text": "Der Tab **Maschinenhistorie** bewahrt jede Miete mit ihren Daten auf: **wer das Rad hatte**, wie lange, wie sie endete und das bei jeder Rückgabe ausgefüllte **Rückgabeprotokoll** (Sterne, Fotos, Paket)."
        },
        {
          "title": "Mietende",
          "text": "**Mietende** öffnet das **Rückgabeprotokoll**: optischer Zustand von **0 bis 3 Sternen**, **Fotos**, funktioniert das Rad, ist das Paket vollständig. Nach der Bestätigung geht das Rad zurück ins Lager (oder in die **Wartung**, wenn es beschädigt ist, nicht funktioniert oder das Paket unvollständig ist). Der Kunde **behält sein Konto, seine Kampagnen und sein CRM**, aber seine Box erhält den **Befehl, sich zu löschen**, sobald sie das Internet erreicht."
        },
        {
          "title": "Pack vorbereiten",
          "text": "**Pack vorbereiten** (einmal pro Pack): Identität des Rads, **festes Spark-Local-Passwort**, Konfigurationsblock des Rads, **Box-Aktivierung**, dann **einfache TP-Link-Bildschirme** (Router einschalten, erst das Rad, dann die Box mit seinem WLAN verbinden), die Sie abhaken. Das Pack ist dann **bereit** und kann jedem Kunden zugewiesen werden, ohne etwas an der Hardware zu wiederholen. Das **Etikett (10 × 5 cm)** des Rads lässt sich weiter aus der Liste drucken."
        }
      ]
    },
  },
};
