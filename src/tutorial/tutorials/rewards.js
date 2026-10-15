// Tutorial: the Redeem menu — a winner shows their e-mail QR code or 8-character code; you confirm the gift is handed over.
export default {
  id: 'rewards',
  icon: 'gift',
  device: 'desktop',
  admin: false,
  start: '/rewards',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.card form input'); await c.sleep(500); await c.point('.card form', 2400); },
    },
    { // 2
      async run(c) {
        await c.type('.card form input', 'K7QM2X9T', 90);
        await c.click('.card form button[type=submit]');
        await c.waitFor('.card h1'); await c.sleep(900);
      },
    },
    { // 3
      async run(c) { await c.point('.card h1', 1800); await c.point('.card div[style*="text-align: center"] button', 2000); },
    },
    { // 4
      async run(c) {
        await c.click('.card div[style*="text-align: center"] button');
        await c.waitFor(() => document.body.innerText.includes('Camille Martin') && document.querySelectorAll('.card div[style*="text-align: center"] button').length === 1);
        await c.sleep(1400);
      },
    },
    { // 5
      async run(c) { await c.point('.card div[style*="text-align: center"] button', 2200); },
    },
    { // 6
      async run(c) {
        await c.point('table.data-table', 2400);
        await c.click('table.data-table tbody tr:nth-child(3)');
        await c.waitFor('.card h1'); await c.sleep(1600);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Retirer un cadeau',
      summary: 'Le gagnant présente son QR code ou son code : vous confirmez la remise du cadeau en deux clics.',
      steps: [
        { title: 'La page Retrait', text: 'Chaque gagnant reçoit un **e-mail** avec son cadeau, un **QR code** et un **code à 8 caractères**. Au stand, vous le saisissez ici (ou vous scannez le QR code avec un téléphone : la page s’ouvre directement).' },
        { title: 'Saisir le code', text: 'Tapez le code puis **Ouvrir la récompense**. SPARK retrouve le gagnant et son cadeau. Vous pouvez aussi **scanner le QR code avec votre téléphone** lorsque le client vous le présente : la fiche du cadeau s’ouvre directement.' },
        { title: 'Vérifier', text: 'Contrôlez le **cadeau** et le **nom du gagnant**, puis l’état : **À distribuer** signifie que le cadeau n’a pas encore été donné.' },
        { title: 'Confirmer la remise', text: 'Cliquez sur **Distribuer** : SPARK enregistre qui l’a remis et quand. Le même code ne pourra plus servir une seconde fois.' },
        { title: 'Une erreur ?', text: 'Vous pouvez **annuler la distribution** si elle a été validée par erreur : le cadeau repasse à « À distribuer ». Un cadeau peut aussi être **annulé** s’il ne doit pas être donné.' },
        { title: 'L’historique', text: 'Le tableau liste tous les cadeaux et leur état : à distribuer, distribués, expirés ou annulés. **Cliquez une ligne** pour rouvrir un cadeau, par exemple pour retrouver un gagnant qui a perdu son e-mail.' },
      ],
    },
    en: {
      title: 'Hand over a gift',
      summary: 'The winner shows their QR code or code: you confirm the hand-over in two clicks.',
      steps: [
        { title: 'The Redeem page', text: 'Every winner gets an **e-mail** with their gift, a **QR code** and an **8-character code**. At the booth, type it here (or scan the QR code with a phone: the page opens directly).' },
        { title: 'Enter the code', text: 'Type the code then **Open reward**. SPARK finds the winner and their gift. You can also **scan the QR code with your phone** when the customer shows it to you: the gift page opens directly.' },
        { title: 'Check', text: 'Check the **gift** and the **winner’s name**, then the status: **To distribute** means the gift has not been given yet.' },
        { title: 'Confirm the hand-over', text: 'Click **Distribute**: SPARK records who handed it over and when. The same code cannot be used a second time.' },
        { title: 'A mistake?', text: 'You can **cancel the distribution** if it was confirmed by mistake: the gift goes back to “To distribute”. A gift can also be **cancelled** if it should not be given.' },
        { title: 'The history', text: 'The table lists every gift and its status: to distribute, distributed, expired or cancelled. **Click a row** to reopen a gift, for example to find a winner who lost their e-mail.' },
      ],
    },
    es: {
      "title": "Entregar un regalo",
      "summary": "El ganador presenta su código QR o su código: usted confirma la entrega del regalo en dos clics.",
      "steps": [
        {
          "title": "La página Canjear",
          "text": "Cada ganador recibe un **email** con su regalo, un **código QR** y un **código de 8 caracteres**. En el stand, lo introduce aquí (o escanea el código QR con un teléfono: la página se abre directamente)."
        },
        {
          "title": "Introducir el código",
          "text": "Escriba el código y luego **Abrir recompensa**. SPARK encuentra al ganador y su regalo. También puede **escanear el código QR con su teléfono** cuando el cliente se lo presente: la ficha del regalo se abre directamente."
        },
        {
          "title": "Comprobar",
          "text": "Compruebe el **regalo** y el **nombre del ganador**, y luego el estado: **Por distribuir** (verde) significa que el regalo aún no se ha entregado."
        },
        {
          "title": "Confirmar la entrega",
          "text": "Haga clic en **Distribuir**: SPARK registra quién lo entregó y cuándo. El mismo código no podrá usarse una segunda vez."
        },
        {
          "title": "¿Un error?",
          "text": "Puede **cancelar la distribución** si se confirmó por error: el regalo vuelve a «Por distribuir». Un regalo también puede **cancelarse** si no debe entregarse."
        },
        {
          "title": "El historial",
          "text": "La tabla enumera todos los regalos y su estado: por distribuir, distribuidos, caducados o cancelados. **Haga clic en una fila** para reabrir un regalo, por ejemplo para encontrar a un ganador que perdió su email."
        }
      ]
    },
    de: {
      "title": "Ein Geschenk aushändigen",
      "summary": "Der Gewinner zeigt seinen QR-Code oder Code: Sie bestätigen die Aushändigung in zwei Klicks.",
      "steps": [
        {
          "title": "Die Seite Einlösen",
          "text": "Jeder Gewinner erhält eine **E-Mail** mit seinem Geschenk, einem **QR-Code** und einem **Code aus 8 Zeichen**. Am Stand geben Sie ihn hier ein (oder scannen den QR-Code mit einem Telefon: die Seite öffnet sich direkt)."
        },
        {
          "title": "Den Code eingeben",
          "text": "Geben Sie den Code ein, dann **Belohnung öffnen**. SPARK findet den Gewinner und sein Geschenk. Sie können auch **den QR-Code mit Ihrem Telefon scannen**, wenn der Kunde ihn vorzeigt: die Geschenkseite öffnet sich direkt."
        },
        {
          "title": "Prüfen",
          "text": "Prüfen Sie das **Geschenk** und den **Namen des Gewinners**, dann den Status: **Zu verteilen** (grün) bedeutet, dass das Geschenk noch nicht übergeben wurde."
        },
        {
          "title": "Die Aushändigung bestätigen",
          "text": "Klicken Sie auf **Verteilen**: SPARK hält fest, wer es übergeben hat und wann. Derselbe Code kann nicht ein zweites Mal verwendet werden."
        },
        {
          "title": "Ein Fehler?",
          "text": "Sie können die **Verteilung stornieren**, wenn sie versehentlich bestätigt wurde: das Geschenk geht zurück auf „Zu verteilen“. Ein Geschenk kann auch **abgebrochen** werden, wenn es nicht übergeben werden soll."
        },
        {
          "title": "Der Verlauf",
          "text": "Die Tabelle listet alle Geschenke und ihren Status: zu verteilen, verteilt, abgelaufen oder abgebrochen. **Klicken Sie auf eine Zeile**, um ein Geschenk erneut zu öffnen, zum Beispiel um einen Gewinner zu finden, der seine E-Mail verloren hat."
        }
      ]
    },
  },
};
