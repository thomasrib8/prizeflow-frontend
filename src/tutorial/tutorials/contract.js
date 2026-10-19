// Tutorial (administrators): the "Contract & revenue" tab of a client — commercial type, versioned conditions, revenue entries.
const tab = () => document.querySelectorAll('.tabs .tab')[4] || null; // Overview, Profile, Activity, LinkedIn, Contract & revenue
const card = (n) => () => document.querySelectorAll('.mt-card')[n] || null;
const selectIn = () => document.querySelector('.mt-card form select');
const rentInput = () => document.querySelector('.mt-card form input[type=number]');
const saveBtn = () => document.querySelector('.mt-card form button[type=submit]');

export default {
  id: 'contract',
  icon: 'people',
  device: 'desktop',
  admin: true,
  start: '/users/usr_c2',
  steps: [
    { async run(c) { await c.waitFor('.tabs .tab'); await c.sleep(600); await c.click(tab); await c.waitFor('.mt-card form'); await c.sleep(600); await c.point(card(0), 3000); } },
    { async run(c) { await c.point(selectIn, 2000); await c.select(selectIn, 'short'); await c.sleep(500); await c.point(selectIn, 1200); } },
    { async run(c) { await c.fill(rentInput, '350'); await c.sleep(400); await c.point(rentInput, 1400); await c.click(saveBtn); await c.sleep(1200); await c.point(card(0), 2600); } },
    { async run(c) { const last = () => [...document.querySelectorAll('.mt-card')].pop(); await c.point(last, 3600); } },
  ],
  texts: {
    fr: {
      title: 'Contrat & revenus : les conditions d’un client',
      summary: 'Type commercial, prix par version datée, et ce que SPARK en déduit : loyers, locations, activations, prévisionnel.',
      steps: [
        { title: 'L’onglet Contrat & revenus', text: 'Sur la fiche d’un client, l’onglet **Contrat & revenus** donne son **type commercial** : **longue durée** (loyer mensuel), **courte durée** (prix par événement), **revendeur** (loyer par roue détenue + activation) ou **client d’un revendeur** (aucun prix). Le type ne donne **aucun droit** : il sert au calcul du chiffre d’affaires.' },
        { title: 'Changer de type', text: 'On choisit le type, puis les prix. Un **client d’un revendeur** n’a jamais de prix : le revenu va au revendeur.' },
        { title: 'Une nouvelle version, jamais une modification', text: 'Chaque enregistrement crée une **version valable à partir d’une date** : les périodes et locations qui ont déjà commencé gardent leurs conditions. Un loyer se compte en **mois entiers** à partir de la date de départ.' },
        { title: 'Les revenus du compte', text: 'Le tableau liste les écritures : **reconnues** (acquises) et **prévues** (en grisé). Une écriture reconnue ne se modifie pas : on l’**annule** par une écriture inverse. Un loyer est reconnu au **début** de chaque période ; une location courte à sa **fin**.' },
      ],
    },
    en: {
      title: 'Contract & revenue: a client’s conditions',
      summary: 'Commercial type, prices by dated version, and what SPARK derives from them: rents, rentals, activations, forecast.',
      steps: [
        { title: 'The Contract & revenue tab', text: 'On a client’s page, the **Contract & revenue** tab holds its **commercial type**: **long term** (monthly rent), **short term** (price per event), **reseller** (rent per wheel held + activation) or **reseller’s client** (no price). The type gives **no rights**: it only drives the revenue calculation.' },
        { title: 'Changing the type', text: 'Pick the type, then the prices. A **reseller’s client** never has a price: the revenue goes to the reseller.' },
        { title: 'A new version, never an edit', text: 'Each save creates a **version valid from a date**: periods and rentals already started keep their conditions. A rent is counted in **whole months** from the start date.' },
        { title: 'The account’s revenue', text: 'The table lists the entries: **recognized** (earned) and **forecast** (greyed). A recognized entry is never edited: it is **cancelled** by a reversing entry. A rent is recognized at the **start** of each period; a short rental at its **end**.' },
      ],
    },
    es: {
      title: 'Contrato e ingresos: las condiciones de un cliente',
      summary: 'Tipo comercial, precios por versión fechada y lo que SPARK deduce: alquileres, activaciones, previsión.',
      steps: [
        { title: 'La pestaña Contrato e ingresos', text: 'En la ficha de un cliente, la pestaña **Contrato e ingresos** recoge su **tipo comercial**: **larga duración** (alquiler mensual), **corta duración** (precio por evento), **revendedor** (alquiler por rueda + activación) o **cliente de un revendedor** (sin precio). El tipo **no da ningún derecho**: solo sirve para calcular los ingresos.' },
        { title: 'Cambiar el tipo', text: 'Se elige el tipo y luego los precios. Un **cliente de un revendedor** nunca tiene precio: los ingresos van al revendedor.' },
        { title: 'Una nueva versión, nunca una modificación', text: 'Cada guardado crea una **versión válida desde una fecha**: los periodos y alquileres ya iniciados conservan sus condiciones. Un alquiler se cuenta en **meses completos** desde la fecha de inicio.' },
        { title: 'Los ingresos de la cuenta', text: 'La tabla enumera los asientos: **reconocidos** (ganados) y **previstos** (en gris). Un asiento reconocido no se modifica: se **anula** con un asiento inverso. Un alquiler se reconoce al **inicio** de cada periodo; un alquiler corto, al **final**.' },
      ],
    },
    de: {
      title: 'Vertrag & Umsatz: die Konditionen eines Kunden',
      summary: 'Geschäftstyp, Preise nach datierter Version und was SPARK daraus ableitet: Mieten, Vermietungen, Aktivierungen, Prognose.',
      steps: [
        { title: 'Der Reiter Vertrag & Umsatz', text: 'In der Kundenakte enthält der Reiter **Vertrag & Umsatz** den **Geschäftstyp**: **Langzeit** (Monatsmiete), **Kurzzeit** (Preis pro Veranstaltung), **Wiederverkäufer** (Miete pro gehaltenem Rad + Aktivierung) oder **Kunde eines Wiederverkäufers** (kein Preis). Der Typ gibt **keine Rechte**: er dient nur der Umsatzberechnung.' },
        { title: 'Typ ändern', text: 'Man wählt den Typ und dann die Preise. Ein **Kunde eines Wiederverkäufers** hat nie einen Preis: der Umsatz geht an den Wiederverkäufer.' },
        { title: 'Eine neue Version, nie eine Änderung', text: 'Jedes Speichern erzeugt eine **ab einem Datum gültige Version**: bereits begonnene Perioden und Vermietungen behalten ihre Konditionen. Eine Miete wird in **vollen Monaten** ab dem Startdatum gezählt.' },
        { title: 'Der Umsatz des Kontos', text: 'Die Tabelle listet die Buchungen: **erfasst** (verdient) und **prognostiziert** (grau). Eine erfasste Buchung wird nie geändert: sie wird durch eine Gegenbuchung **storniert**. Eine Miete wird zu **Beginn** jeder Periode erfasst, eine Kurzvermietung an ihrem **Ende**.' },
      ],
    },
  },
};
