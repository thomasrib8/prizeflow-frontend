// Tutorial (administrators): give a client a pack that was prepared once in the Parc hardware, then follow its commissioning.
const swRow = (serial) => () => [...document.querySelectorAll('.sw-row[role=radio]')].find((r) => r.innerText.includes(serial)) || null;
const assignBtn = () => { const b = document.querySelectorAll('.sw-foot button'); return b.length ? b[b.length - 1] : null; };

export default {
  id: 'setup-wizard',
  icon: 'wrench',
  device: 'desktop',
  admin: true,
  start: '/users/usr_c3',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.page-header .btn-primary'); await c.sleep(600); await c.click('.page-header .btn-primary'); await c.waitFor('.sw-card'); await c.sleep(900); await c.point('.sw-card', 2600); },
    },
    { // 2
      async run(c) {
        await c.click(swRow('PF260000153')); await c.sleep(600); await c.point('.sw-row.sel', 1800);
        await c.type('.sw-card .sw-two input', 'Bio Expo, stand 4'); await c.sleep(500); await c.point('.sw-two', 2200);
      },
    },
    { // 3
      async run(c) {
        c.demo('wheelLive', 'on'); c.demo('box', 'activated');
        await c.click(assignBtn); await c.waitFor('.ud-hw-hero .ud-hw-serial', 8000); await c.sleep(1200);
        await c.point('.ud-hw-hero', 2200); await c.point('.sw-check', 2800);
      },
    },
    { // 4
      async run(c) {
        await c.click(() => [...document.querySelectorAll('.sw-card button')].find((b) => /btn-secondary/.test(b.className)));
        await c.waitFor('#handover-sheet', 6000); await c.sleep(900); await c.point('#handover-sheet', 3200);
      },
    },
    { // 5
      async run(c) { await c.point('.ud-hw-actions', 3000); },
    },
  ],
  texts: {
  "fr": {
    "title": "Attribuer un pack à un client",
    "summary": "Le pack se prépare une seule fois dans le Parc hardware ; depuis la fiche du client, on l'attribue et il se met en service tout seul.",
    "steps": [
      {
        "title": "Ouvrir l’attribution",
        "text": "Sur la **fiche du client**, **Attribuer un pack** ouvre l’onglet **Attribution du matériel**. Il liste les **packs prêts et disponibles** : ceux qui ont été préparés une fois pour toutes dans le **Parc hardware**."
      },
      {
        "title": "Choisir le pack",
        "text": "Sélectionnez un pack. Les autres sont grisés avec la raison : **en location chez…**, **en maintenance** ou **préparation à terminer**. Vous pouvez ajouter une **remarque** (événement, contact) et la **date de retour prévue**."
      },
      {
        "title": "Attribuer et suivre",
        "text": "**Attribuer et mettre en service** suffit : il n’y a **rien à régler sur le matériel**. Dès que le pack est allumé et en ligne, la roue et le boîtier suivent ce client. Le **suivi** indique ce qui est déjà en place."
      },
      {
        "title": "La fiche de remise",
        "text": "La **fiche de remise** imprimable réunit la roue, le boîtier, le Wi-Fi Spark-Local avec son mot de passe (celui du pack), les deux QR codes et votre numéro de dépannage."
      },
      {
        "title": "Changer ou terminer",
        "text": "**Changer de pack** remet l’ancien au dépôt (son boîtier est effacé à distance). **Fin de location** ouvre le constat de retour. Le client garde son compte, ses campagnes et son CRM."
      }
    ]
  },
  "en": {
    "title": "Assign a pack to a client",
    "summary": "The pack is prepared once in the Hardware park; from the client’s page you assign it and it puts itself into service.",
    "steps": [
      {
        "title": "Open the assignment",
        "text": "On the **client’s page**, **Assign a pack** opens the **Hardware assignment** tab. It lists the **packs that are ready and available**: those prepared once and for all in the **Hardware park**."
      },
      {
        "title": "Choose the pack",
        "text": "Select a pack. The others are greyed out with the reason: **rented to…**, **in maintenance** or **preparation to finish**. You can add a **note** (event, contact) and the **planned return date**."
      },
      {
        "title": "Assign and follow",
        "text": "**Assign and put into service** is all it takes: there is **nothing to set up on the hardware**. As soon as the pack is on and online, the wheel and the box follow this client. The **tracker** shows what is already in place."
      },
      {
        "title": "The hand-over sheet",
        "text": "The printable **hand-over sheet** gathers the wheel, the box, the Spark-Local Wi-Fi with its password (the pack’s), the two QR codes and your support number."
      },
      {
        "title": "Change or end",
        "text": "**Change pack** sends the old one back to the depot (its box is erased remotely). **End of rental** opens the return inspection. The client keeps their account, campaigns and CRM."
      }
    ]
  },
  "es": {
    "title": "Asignar un pack a un cliente",
    "summary": "El pack se prepara una sola vez en el Parque de hardware; desde la ficha del cliente se asigna y se pone en servicio solo.",
    "steps": [
      {
        "title": "Abrir la asignación",
        "text": "En la **ficha del cliente**, **Asignar un pack** abre la pestaña **Asignación del equipo**. Enumera los **packs listos y disponibles**: los preparados de una vez por todas en el **Parque de hardware**."
      },
      {
        "title": "Elegir el pack",
        "text": "Seleccione un pack. Los demás aparecen atenuados con el motivo: **alquilado a…**, **en mantenimiento** o **preparación por terminar**. Puede añadir una **nota** (evento, contacto) y la **fecha de devolución prevista**."
      },
      {
        "title": "Asignar y seguir",
        "text": "**Asignar y poner en servicio** basta: **no hay nada que configurar en el equipo**. En cuanto el pack está encendido y en línea, la rueda y la caja siguen a este cliente. El **seguimiento** indica lo que ya está en su sitio."
      },
      {
        "title": "La hoja de entrega",
        "text": "La **hoja de entrega** imprimible reúne la rueda, la caja, el Wi-Fi Spark-Local con su contraseña (la del pack), los dos códigos QR y su número de asistencia."
      },
      {
        "title": "Cambiar o terminar",
        "text": "**Cambiar de pack** devuelve el anterior al depósito (su caja se borra a distancia). **Fin del alquiler** abre el informe de devolución. El cliente conserva su cuenta, sus campañas y su CRM."
      }
    ]
  },
  "de": {
    "title": "Einem Kunden ein Pack zuweisen",
    "summary": "Das Pack wird einmal im Hardware-Park vorbereitet; auf der Kundenseite weisen Sie es zu und es nimmt sich selbst in Betrieb.",
    "steps": [
      {
        "title": "Die Zuweisung öffnen",
        "text": "Auf der **Kundenseite** öffnet **Pack zuweisen** den Tab **Hardware-Zuweisung**. Er listet die **bereiten und verfügbaren Packs**: jene, die einmalig im **Hardware-Park** vorbereitet wurden."
      },
      {
        "title": "Das Pack wählen",
        "text": "Wählen Sie ein Pack. Die anderen sind ausgegraut mit dem Grund: **vermietet an …**, **in Wartung** oder **Vorbereitung abzuschließen**. Sie können eine **Notiz** (Veranstaltung, Kontakt) und das **geplante Rückgabedatum** ergänzen."
      },
      {
        "title": "Zuweisen und verfolgen",
        "text": "**Zuweisen und in Betrieb nehmen** genügt: **An der Hardware ist nichts einzustellen**. Sobald das Pack eingeschaltet und online ist, folgen Rad und Box diesem Kunden. Der **Fortschritt** zeigt, was schon steht."
      },
      {
        "title": "Das Übergabeblatt",
        "text": "Das druckbare **Übergabeblatt** enthält Rad, Box, das WLAN Spark-Local mit Passwort (das des Packs), die beiden QR-Codes und Ihre Support-Nummer."
      },
      {
        "title": "Wechseln oder beenden",
        "text": "**Pack wechseln** schickt das alte ins Depot (seine Box wird aus der Ferne gelöscht). **Mietende** öffnet das Rückgabeprotokoll. Der Kunde behält Konto, Kampagnen und CRM."
      }
    ]
  }
},
};
