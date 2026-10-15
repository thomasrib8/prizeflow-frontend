// Tutorial: add and enrich a contact — a badge photo reads the name, the e-mail is found automatically, LinkedIn can be linked.
// The "photo" is a made-up image handed to the real file input (no camera in a tutorial).
async function fakeBadgePhoto() {
  const cv = document.createElement('canvas'); cv.width = 480; cv.height = 300;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 480, 300); g.fillStyle = '#09B2FD'; g.fillRect(0, 0, 480, 70);
  g.fillStyle = '#03041A'; g.font = 'bold 42px sans-serif'; g.fillText('Nadia Benali', 40, 150); g.font = '26px sans-serif'; g.fillText('Cuisines Benali', 40, 200);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  return new File([blob], 'badge.png', { type: 'image/png' });
}
const modalInput = (k) => () => document.querySelectorAll('.modal-card form input, form.modal-card input')[k] || null;

export default {
  id: 'enrichment',
  icon: 'userplus',
  device: 'desktop',
  admin: false,
  start: '/launch',
  steps: [
    { // 1
      async run(c) {
        await c.waitFor('.launch-header button');
        await c.click(() => document.querySelector('.launch-header > div:last-child > button'));
        await c.waitFor('.modal-card'); await c.sleep(900);
        await c.point('.modal-card > div[style*="dashed"]', 2800);
      },
    },
    { // 2
      async run(c) {
        const input = document.querySelector('.modal-card input[type=file]');
        const dt = new DataTransfer(); dt.items.add(await fakeBadgePhoto());
        input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
        await c.waitFor(() => { const i = document.querySelector('.modal-card form input, form.modal-card input[required]'); return document.querySelector('.modal-card input[required]')?.value ? i : null; }, 8000);
        await c.sleep(1200);
        await c.point('.modal-card input[required]', 2200);
      },
    },
    { // 3
      async run(c) {
        await c.waitFor(() => document.querySelector('.hunter-search-bar') || [...document.querySelectorAll('.modal-card div')].find((d) => /92/.test(d.textContent) && d.children.length === 0), 9000);
        await c.waitFor(() => (document.querySelector('.hunter-search-bar') ? null : document.querySelector('.modal-card input[type=email]')), 9000);
        await c.sleep(900);
        await c.point('.modal-card input[type=email]', 3000);
      },
    },
    { // 4
      async run(c) {
        await c.click('.li-field button');
        await c.waitFor('.li-btn.primary'); await c.sleep(1100);
        await c.click('.li-btn.primary');
        await c.waitFor(() => [...document.querySelectorAll('.li-btn.primary')].find((b) => !b.disabled && document.querySelector('.li-warn, a[href*="linkedin.com/in"]')), 9000);
        await c.sleep(1200);
        await c.point('.li-card, a[href*="linkedin.com/in"]', 2200);
      },
    },
    { // 5
      async run(c) {
        await c.click('.li-btn.primary:last-of-type');
        await c.waitFor(() => (document.querySelector('.li-btn') ? null : document.body), 6000); await c.sleep(900);
        await c.point('.li-field', 2200);
      },
    },
    { // 6
      async run(c) {
        const saveOnly = () => { const bs = [...document.querySelectorAll('.modal-card button')]; return bs[bs.length - 2] || null; };
        const consent = () => [...document.querySelectorAll('.modal-card input[type=checkbox]')].pop() || null;
        await c.point(() => consent()?.closest('label'), 2200);
        if (consent() && !consent().checked) await c.click(consent);
        await c.point(saveOnly, 1800);
        await c.click(saveOnly);
        await c.waitFor(() => (document.querySelector('.modal-card') ? null : document.body), 8000); await c.sleep(1200);
        await c.point('table.data-table tbody tr:first-child', 2400);
      },
    },
  ],
  texts: {
    fr: {
      title: 'Ajouter et enrichir un contact',
      summary: 'Photo d’un badge, e-mail retrouvé automatiquement, profil LinkedIn : une fiche complète en quelques secondes.',
      steps: [
        { title: 'Nouveau prospect', text: '**Nouveau prospect** (sur l’ordinateur comme sur le téléphone) ajoute quelqu’un qui n’a pas scanné le QR code. Vous pouvez tout saisir à la main… ou **photographier son badge ou sa carte de visite**.' },
        { title: 'La photo remplit la fiche', text: 'SPARK lit la photo : **prénom, nom, entreprise, téléphone**. Si le badge porte un QR code de contact, il est lu à l’identique, sans envoyer la photo. Les champs douteux sont signalés en orange : **vérifiez-les** avant d’enregistrer.' },
        { title: 'L’e-mail retrouvé tout seul', text: 'Pas d’e-mail sur le badge ? Dès que le **prénom, le nom et l’entreprise** sont connus, SPARK **cherche l’adresse** pour vous et affiche un **score de confiance**. L’e-mail trouvé reste modifiable. Ce service demande internet et n’existe pas sur le boîtier.' },
        { title: 'Le profil LinkedIn', text: 'Si l’option est activée pour votre compte, **Trouver le LinkedIn** propose le profil de la personne. Une recherche consomme **un crédit** de votre solde, affiché dans la fenêtre : SPARK demande confirmation avant de chercher.' },
        { title: 'Confirmer le profil', text: 'Vérifiez le **nom, le poste et l’entreprise** : **Confirmer ce profil** rattache le profil à la fiche, **Rejeter** l’écarte. Vous pouvez aussi coller un lien à la main.' },
        { title: 'Enregistrer', text: 'Vérifiez que la **confirmation du consentement** est cochée (le contact a accepté d’être recontacté), puis **Enregistrer uniquement** : le contact est dans le CRM, avec son origine tracée. **Jouer** l’enregistre et l’ajoute aussi à la file pour qu’il joue.' },
      ],
    },
    en: {
      title: 'Add and enrich a contact',
      summary: 'A badge photo, an e-mail found automatically, a LinkedIn profile: a complete record in seconds.',
      steps: [
        { title: 'New prospect', text: '**New prospect** (on the computer as on the phone) adds someone who did not scan the QR code. You can type everything… or **photograph their badge or business card**.' },
        { title: 'The photo fills the record', text: 'SPARK reads the photo: **first name, last name, company, phone**. If the badge carries a contact QR code it is read exactly, without sending the photo anywhere. Doubtful fields are flagged in orange: **check them** before saving.' },
        { title: 'The e-mail found by itself', text: 'No e-mail on the badge? As soon as the **first name, last name and company** are known, SPARK **looks the address up** for you and shows a **confidence score**. The e-mail found can still be edited. This service needs the internet and is not available on the box.' },
        { title: 'The LinkedIn profile', text: 'If the option is on for your account, **Find LinkedIn** suggests the person’s profile. A search uses **one credit** of your balance, shown in the window: SPARK asks for confirmation before searching.' },
        { title: 'Confirm the profile', text: 'Check the **name, job title and company**: **Confirm this profile** attaches the profile to the record, **Reject** discards it. You can also paste a link by hand.' },
        { title: 'Save', text: 'Check that the **consent confirmation** is ticked (the contact agreed to be contacted again), then **Save only**: the contact is in the CRM, with its origin recorded. **Play** also saves them and adds them to the queue so they play.' },
      ],
    },
    es: {
      "title": "Añadir y enriquecer un contacto",
      "summary": "Foto de una credencial, email encontrado automáticamente, perfil de LinkedIn: una ficha completa en segundos.",
      "steps": [
        {
          "title": "Nuevo prospecto",
          "text": "**+ Nuevo prospecto** (en el ordenador como en el teléfono) añade a alguien que no escaneó el código QR. Puede escribirlo todo a mano… o **fotografiar su credencial o tarjeta de visita**."
        },
        {
          "title": "La foto rellena la ficha",
          "text": "SPARK lee la foto: **nombre, apellido, empresa, teléfono**. Si la credencial lleva un código QR de contacto, se lee tal cual, sin enviar la foto. Los campos dudosos se señalan en naranja: **compruébelos** antes de guardar."
        },
        {
          "title": "El email encontrado solo",
          "text": "¿Sin email en la credencial? En cuanto se conocen **nombre, apellido y empresa**, SPARK **busca la dirección** por usted y muestra una **puntuación de confianza**. El email encontrado sigue siendo editable. Este servicio necesita internet y no existe en la caja."
        },
        {
          "title": "El perfil de LinkedIn",
          "text": "Si la opción está activada en su cuenta, **Buscar LinkedIn** propone el perfil de la persona. Una búsqueda consume **un crédito** de su saldo, que se muestra en la ventana: SPARK pide confirmación antes de buscar."
        },
        {
          "title": "Confirmar el perfil",
          "text": "Compruebe el **nombre, el puesto y la empresa**: **Confirmar este perfil** vincula el perfil a la ficha, **Rechazar** lo descarta. También puede pegar un enlace a mano."
        },
        {
          "title": "Guardar",
          "text": "Compruebe que la **confirmación del consentimiento** está marcada (el contacto aceptó ser contactado de nuevo) y luego **Solo guardar**: el contacto está en el CRM, con su origen registrado. **Jugar** también lo guarda y lo añade a la cola para que juegue."
        }
      ]
    },
    de: {
      "title": "Einen Kontakt hinzufügen und anreichern",
      "summary": "Badge-Foto, automatisch gefundene E-Mail, LinkedIn-Profil: ein vollständiges Profil in Sekunden.",
      "steps": [
        {
          "title": "Neuer Interessent",
          "text": "**+ Neuer Interessent** (am Computer wie am Telefon) fügt jemanden hinzu, der den QR-Code nicht gescannt hat. Sie können alles von Hand eingeben … oder **sein Badge oder seine Visitenkarte fotografieren**."
        },
        {
          "title": "Das Foto füllt das Profil",
          "text": "SPARK liest das Foto: **Vorname, Nachname, Firma, Telefon**. Trägt das Badge einen Kontakt-QR-Code, wird er exakt gelesen, ohne das Foto irgendwohin zu senden. Zweifelhafte Felder werden orange markiert: **prüfen Sie sie** vor dem Speichern."
        },
        {
          "title": "Die von selbst gefundene E-Mail",
          "text": "Keine E-Mail auf dem Badge? Sobald **Vorname, Nachname und Firma** bekannt sind, **sucht SPARK die Adresse** für Sie und zeigt einen **Vertrauenswert**. Die gefundene E-Mail bleibt editierbar. Dieser Dienst braucht Internet und existiert auf der Box nicht."
        },
        {
          "title": "Das LinkedIn-Profil",
          "text": "Ist die Option für Ihr Konto aktiviert, schlägt **LinkedIn finden** das Profil der Person vor. Eine Suche verbraucht **einen Credit** Ihres Guthabens, im Fenster angezeigt: SPARK fragt vor der Suche nach Bestätigung."
        },
        {
          "title": "Das Profil bestätigen",
          "text": "Prüfen Sie **Name, Position und Firma**: **Dieses Profil bestätigen** verknüpft das Profil mit dem Kontakt, **Ablehnen** verwirft es. Sie können auch einen Link von Hand einfügen."
        },
        {
          "title": "Speichern",
          "text": "Prüfen Sie, dass die **Bestätigung der Einwilligung** angekreuzt ist (der Kontakt hat zugestimmt, erneut kontaktiert zu werden), dann **Nur speichern**: der Kontakt ist im CRM, mit festgehaltener Herkunft. **Spielen** speichert ihn auch und fügt ihn der Warteschlange hinzu, damit er spielt."
        }
      ]
    },
  },
};
