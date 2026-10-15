// Tutorial: the Settings — a tour of each tab (information, Google reviews, social networks, reward e-mails, AI assistant,
// privacy, local mode, calibration).
const tab = (n) => () => document.querySelectorAll('.tabs')[0]?.querySelectorAll('.tab')[n] || null;
const view = (extra = '') => `main .card${extra}`;

export default {
  id: 'settings',
  icon: 'gear',
  device: 'desktop',
  admin: false,
  start: '/settings',
  steps: [
    { // 1
      async run(c) { await c.waitFor('.tabs .tab'); await c.sleep(500); await c.point('.tabs', 1800); await c.point(view(), 2200); },
    },
    { // 2
      async run(c) { await c.click(tab(1)); await c.sleep(900); await c.point(view(), 2600); },
    },
    { // 3
      async run(c) { await c.click(tab(2)); await c.sleep(900); await c.point(view(), 2600); },
    },
    { // 4
      async run(c) { await c.click(tab(3)); await c.sleep(1100); await c.point(view(), 2800); },
    },
    { // 5
      async run(c) { await c.click(tab(4)); await c.sleep(900); await c.point(view(), 2600); },
    },
    { // 6
      async run(c) { await c.click(tab(5)); await c.sleep(1100); await c.point(view(), 2800); },
    },
    { // 7
      async run(c) { await c.click(tab(6)); await c.sleep(1100); await c.point(view(), 2800); },
    },
    { // 8
      async run(c) { await c.click(tab(7)); await c.sleep(1100); await c.point('main > div > *:nth-child(3)', 2800); },
    },
  ],
  texts: {
    fr: {
      title: 'Les paramètres de votre compte',
      summary: 'Un tour de chaque onglet : informations, avis Google, réseaux sociaux, e-mails, assistant IA, confidentialité, mode local et calibrage.',
      steps: [
        { title: 'Informations', text: 'Vos **coordonnées** (nom, entreprise, adresse, téléphone), votre **mot de passe** et la **double authentification** : recommandée, elle protège votre compte même si votre mot de passe est connu. Votre numéro figure aussi sur la fiche de remise du matériel.' },
        { title: 'Avis Google', text: 'Renseignez le lien de votre fiche Google : vos invités pourront **laisser un avis** juste après leur cadeau, ou avant de jouer selon la campagne. L’invitation reste **facultative**, conformément aux règles de Google.' },
        { title: 'Réseaux sociaux', text: 'Vos pages **Facebook, Instagram, LinkedIn et X** s’affichent à l’invité sur l’écran du résultat, pour qu’il vous suive. Laissez vide ce que vous n’utilisez pas.' },
        { title: 'E-mails de récompense', text: 'Personnalisez l’**e-mail du cadeau** : objet, texte et logo, pour chaque mode de retrait (QR, code, bon, personnalisé). Des variables comme le prénom ou le cadeau s’insèrent automatiquement.' },
        { title: 'Assistant IA', text: 'Activez l’**assistant IA** qui lit vos notes et remplit les fiches. En mode **supervisé**, rien n’est modifié sans votre validation. Il est désactivé tant que vous ne l’activez pas, pour votre compte et pour chaque campagne.' },
        { title: 'Confidentialité (RGPD)', text: 'Votre **politique de confidentialité**, la **durée de conservation** des données et le recueil du **consentement marketing**. Vous pouvez aussi **exporter ou effacer** les données d’une personne sur sa demande.' },
        { title: 'Mode local', text: 'Pour le **boîtier d’événement** : le code d’accès du kiosque, la **feuille de connexion Wi-Fi** à imprimer, et l’**alerte e-mail** si la roue perd la connexion pendant une campagne active.' },
        { title: 'Calibrage', text: 'Le **calibrage** règle la position de la roue (la case sous le repère rouge). À faire une fois à l’installation, ou si la case annoncée ne correspond plus à la case réelle.' },
      ],
    },
    en: {
      title: 'Your account settings',
      summary: 'A tour of each tab: information, Google reviews, social networks, e-mails, AI assistant, privacy, local mode and calibration.',
      steps: [
        { title: 'Information', text: 'Your **contact details** (name, company, address, phone), your **password** and **two-step sign-in**: recommended, it protects your account even if your password is known. Your number also appears on the equipment hand-over sheet.' },
        { title: 'Google reviews', text: 'Enter the link to your Google listing: your guests can **leave a review** right after their gift, or before playing depending on the campaign. The invitation stays **optional**, as Google’s rules require.' },
        { title: 'Social networks', text: 'Your **Facebook, Instagram, LinkedIn and X** pages are shown to the guest on the result screen, so they follow you. Leave empty what you do not use.' },
        { title: 'Reward e-mails', text: 'Customise the **gift e-mail**: subject, text and logo, for each redeem method (QR, code, voucher, custom). Variables such as the first name or the gift are inserted automatically.' },
        { title: 'AI assistant', text: 'Turn on the **AI assistant** that reads your notes and fills the records. In **supervised** mode nothing changes without your approval. It stays off until you enable it, for your account and for each campaign.' },
        { title: 'Privacy (GDPR)', text: 'Your **privacy policy**, the **retention period** and the collection of **marketing consent**. You can also **export or erase** one person’s data on their request.' },
        { title: 'Local mode', text: 'For the **event box**: the kiosk access code, the **Wi-Fi connection sheet** to print, and the **e-mail alert** if the wheel loses its connection during an active campaign.' },
        { title: 'Calibration', text: '**Calibration** sets the wheel’s position (the case under the red marker). Do it once at installation, or if the announced case no longer matches the real one.' },
      ],
    },
    es: {
      "title": "Los ajustes de su cuenta",
      "summary": "Un recorrido por cada pestaña: información, reseñas de Google, redes sociales, emails, asistente IA, privacidad, modo local y calibración.",
      "steps": [
        {
          "title": "Información",
          "text": "Sus **datos de contacto** (nombre, empresa, dirección, teléfono), su **contraseña** y la **verificación en dos pasos**: recomendada, protege su cuenta aunque se conozca su contraseña. Su número también figura en la hoja de entrega del equipo."
        },
        {
          "title": "Reseña de Google",
          "text": "Indique el enlace de su ficha de Google: sus invitados podrán **dejar una reseña** justo después de su regalo, o antes de jugar según la campaña. La invitación sigue siendo **opcional**, como exigen las normas de Google."
        },
        {
          "title": "Redes sociales",
          "text": "Sus páginas de **Facebook, Instagram, LinkedIn y X** se muestran al invitado en la pantalla del resultado, para que le siga. Deje vacío lo que no use."
        },
        {
          "title": "Emails de recompensa",
          "text": "Personalice el **email del regalo**: asunto, texto y logotipo, para cada modo de canje (QR, código, vale, personalizado). Variables como el nombre o el regalo se insertan automáticamente."
        },
        {
          "title": "Asistente IA",
          "text": "Active el **asistente IA** que lee sus notas y rellena las fichas. En modo **supervisado** no se modifica nada sin su validación. Está desactivado mientras no lo active, para su cuenta y para cada campaña."
        },
        {
          "title": "Privacidad (RGPD)",
          "text": "Su **política de privacidad**, el **plazo de conservación** de los datos y la recogida del **consentimiento de marketing**. También puede **exportar o borrar** los datos de una persona a petición suya."
        },
        {
          "title": "Modo local",
          "text": "Para la **caja del evento**: el código de acceso del kiosco, el **código QR del Wi-Fi para imprimir** y la **alerta por email** si la rueda pierde la conexión durante una campaña activa."
        },
        {
          "title": "Calibración",
          "text": "La **calibración** ajusta la posición de la rueda (la casilla bajo la marca roja). Hágala una vez en la instalación, o si la casilla anunciada ya no coincide con la real."
        }
      ]
    },
    de: {
      "title": "Die Einstellungen Ihres Kontos",
      "summary": "Ein Rundgang durch jeden Reiter: Informationen, Google-Bewertung, soziale Medien, E-Mails, KI-Assistent, Datenschutz, lokaler Modus und Kalibrierung.",
      "steps": [
        {
          "title": "Informationen",
          "text": "Ihre **Kontaktdaten** (Name, Firma, Adresse, Telefon), Ihr **Passwort** und die **Zwei-Schritt-Anmeldung**: empfohlen, sie schützt Ihr Konto, selbst wenn Ihr Passwort bekannt ist. Ihre Nummer steht auch auf dem Übergabeblatt der Ausrüstung."
        },
        {
          "title": "Google-Bewertung",
          "text": "Tragen Sie den Link zu Ihrem Google-Eintrag ein: Ihre Gäste können direkt nach ihrem Geschenk **eine Bewertung abgeben**, oder je nach Kampagne vor dem Spielen. Die Einladung bleibt **freiwillig**, wie es die Google-Regeln verlangen."
        },
        {
          "title": "Soziale Medien",
          "text": "Ihre **Facebook-, Instagram-, LinkedIn- und X**-Seiten werden dem Gast auf dem Ergebnisbildschirm angezeigt, damit er Ihnen folgt. Lassen Sie leer, was Sie nicht nutzen."
        },
        {
          "title": "Belohnungs-E-Mails",
          "text": "Passen Sie die **Geschenk-E-Mail** an: Betreff, Text und Logo, für jede Einlöseart (QR, Code, Gutschein, individuell). Variablen wie Vorname oder Geschenk werden automatisch eingefügt."
        },
        {
          "title": "KI-Assistent",
          "text": "Aktivieren Sie den **KI-Assistenten**, der Ihre Notizen liest und die Profile ausfüllt. Im **überwachten** Modus ändert sich nichts ohne Ihre Freigabe. Er bleibt aus, bis Sie ihn aktivieren, für Ihr Konto und für jede Kampagne."
        },
        {
          "title": "Datenschutz (DSGVO)",
          "text": "Ihre **Datenschutzerklärung**, die **Aufbewahrungsdauer** der Daten und die Erhebung der **Marketing-Einwilligung**. Sie können auch die Daten einer Person auf deren Wunsch **exportieren oder löschen**."
        },
        {
          "title": "Lokaler Modus",
          "text": "Für die **Veranstaltungs-Box**: der Zugangscode des Kiosks, der **WLAN-QR-Code zum Drucken** und die **E-Mail-Warnung**, wenn das Rad während einer aktiven Kampagne die Verbindung verliert."
        },
        {
          "title": "Kalibrierung",
          "text": "Die **Kalibrierung** stellt die Position des Rads ein (das Feld unter der roten Markierung). Führen Sie sie einmal bei der Installation durch, oder wenn das angekündigte Feld nicht mehr mit dem tatsächlichen übereinstimmt."
        }
      ]
    },
  },
};
