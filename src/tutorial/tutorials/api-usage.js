// Tutorial (administrators): API consumption — what the external services cost, by provider, client and reseller, and the reconciliation.
const tab = (n) => () => document.querySelectorAll('.tabs .tab')[n] || null;
const card = (n) => () => document.querySelectorAll('.mt-card')[n] || null;

export default {
  id: 'api-usage',
  icon: 'gear',
  device: 'desktop',
  admin: true,
  start: '/api-usage',
  steps: [
    { async run(c) { await c.waitFor('.grid-stats'); await c.sleep(700); await c.point('.grid-stats', 3200); } },
    { async run(c) { await c.point('table.data-table', 3200); await c.point(card(1), 2200); } },
    { async run(c) { await c.click('table.data-table tbody tr:nth-child(2)'); await c.waitFor('.grid-stats'); await c.sleep(900); await c.point('.grid-stats', 2400); await c.point('table.data-table', 2600); } },
    { async run(c) { await c.click(tab(2)); await c.waitFor('table.data-table'); await c.sleep(800); await c.point('table.data-table', 4200); } },
    { async run(c) { await c.click(tab(0)); await c.waitFor('.grid-stats'); await c.sleep(700); const rec = () => [...document.querySelectorAll('.mt-card')].find((x) => x.querySelector('button.btn-secondary')); await c.point(rec, 4200); } },
  ],
  texts: {
    fr: {
      title: 'Consommation API : ce que coûtent les services externes',
      summary: 'Coût réel, imputé et non alloué, par fournisseur, par client et par revendeur ; quotas ; rapprochement avec les fournisseurs.',
      steps: [
        { title: 'Trois coûts, jamais mélangés', text: 'Le **coût réel** est ce que facturent les fournisseurs ; le **coût imputé** est la part attribuée aux comptes qui ont consommé ; le **coût non alloué** est le reste (quota payé non utilisé, crédits expirés, abonnements). Le ratio **coûts API / CA** compare au chiffre d’affaires reconnu du mois.' },
        { title: 'Par fournisseur', text: 'Chaque ligne donne les appels, le **forfait** et son avancement dans le quota, les trois coûts et la **nature** de la donnée (réelle, calculée, estimée). Un coût **incomplet** signale des appels sans tarif connu : ils ne sont **jamais comptés à zéro**.' },
        { title: 'La fiche d’un fournisseur', text: 'Un clic ouvre la fiche : **par fonctionnalité** (avec les jetons pour Claude), évolution par jour, comptes les plus consommateurs, paquets de crédits prépayés et historique des rapprochements.' },
        { title: 'Clients et revendeurs', text: 'Pour chaque compte : coût API propre, revenus et **contribution**. Pour un revendeur, le coût de **ses clients** est consolidé : contribution = loyers + activations − son coût − celui de ses clients. Export **CSV** disponible.' },
        { title: 'Le rapprochement quotidien', text: 'Chaque jour SPARK compare **son propre journal** à ce que le fournisseur permet de relire (sans consommer de crédit). Un **écart** au-dessus du seuil réglé dans **Paramètres › Alertes et seuils** déclenche une alerte : appels non journalisés ou changement de tarif.' },
      ],
    },
    en: {
      title: 'API consumption: what the external services cost',
      summary: 'Real, imputed and unallocated cost, by provider, client and reseller; quotas; reconciliation with the providers.',
      steps: [
        { title: 'Three costs, never mixed', text: 'The **real cost** is what the providers charge; the **imputed cost** is the share attributed to the accounts that consumed; the **unallocated cost** is the rest (unused paid quota, expired credits, subscriptions). The **API costs / revenue** ratio compares with the month’s recognized revenue.' },
        { title: 'By provider', text: 'Each line gives the calls, the **plan** and its progress in the quota, the three costs and the **nature** of the data (real, computed, estimated). An **incomplete** cost flags calls with no known tariff: they are **never counted as zero**.' },
        { title: 'A provider’s sheet', text: 'A click opens the sheet: **by feature** (with tokens for Claude), evolution per day, heaviest accounts, prepaid credit packs and the reconciliation history.' },
        { title: 'Clients and resellers', text: 'For each account: own API cost, revenue and **contribution**. For a reseller the cost of **its clients** is consolidated: contribution = rents + activations − its cost − its clients’ cost. **CSV** export available.' },
        { title: 'The daily reconciliation', text: 'Every day SPARK compares **its own journal** with what the provider lets us read (no credit consumed). A **gap** above the threshold set in **Settings › Alerts and thresholds** raises an alert: calls not journalled or a change of tariff.' },
      ],
    },
    es: {
      title: 'Consumo de API: lo que cuestan los servicios externos',
      summary: 'Coste real, imputado y no asignado, por proveedor, cliente y revendedor; cuotas; conciliación con los proveedores.',
      steps: [
        { title: 'Tres costes, nunca mezclados', text: 'El **coste real** es lo que facturan los proveedores; el **coste imputado** es la parte atribuida a las cuentas que consumieron; el **coste no asignado** es el resto (cuota pagada sin usar, créditos caducados, suscripciones). El ratio **costes API / ingresos** compara con los ingresos reconocidos del mes.' },
        { title: 'Por proveedor', text: 'Cada línea da las llamadas, el **plan** y su avance en la cuota, los tres costes y la **naturaleza** del dato (real, calculado, estimado). Un coste **incompleto** señala llamadas sin tarifa conocida: **nunca se cuentan como cero**.' },
        { title: 'La ficha de un proveedor', text: 'Un clic abre la ficha: **por funcionalidad** (con tokens para Claude), evolución por día, cuentas que más consumen, paquetes de créditos prepagados e historial de conciliaciones.' },
        { title: 'Clientes y revendedores', text: 'Para cada cuenta: coste API propio, ingresos y **contribución**. Para un revendedor se consolida el coste de **sus clientes**: contribución = alquileres + activaciones − su coste − el de sus clientes. Exportación **CSV** disponible.' },
        { title: 'La conciliación diaria', text: 'Cada día SPARK compara **su propio registro** con lo que el proveedor permite leer (sin consumir créditos). Una **diferencia** superior al umbral fijado en **Ajustes › Alertas y umbrales** genera una alerta: llamadas no registradas o cambio de tarifa.' },
      ],
    },
    de: {
      title: 'API-Verbrauch: was die externen Dienste kosten',
      summary: 'Reale, zugerechnete und nicht zugeordnete Kosten, nach Anbieter, Kunde und Wiederverkäufer; Kontingente; Abgleich mit den Anbietern.',
      steps: [
        { title: 'Drei Kosten, nie vermischt', text: 'Die **realen Kosten** sind das, was die Anbieter berechnen; die **zugerechneten Kosten** sind der den verbrauchenden Konten zugeordnete Anteil; die **nicht zugeordneten Kosten** sind der Rest (ungenutztes Kontingent, verfallene Guthaben, Abonnements). Das Verhältnis **API-Kosten / Umsatz** vergleicht mit dem erfassten Umsatz des Monats.' },
        { title: 'Nach Anbieter', text: 'Jede Zeile zeigt Aufrufe, **Tarif** und Fortschritt im Kontingent, die drei Kosten und die **Art** der Daten (real, berechnet, geschätzt). **Unvollständige** Kosten kennzeichnen Aufrufe ohne bekannten Tarif: sie werden **nie als null gezählt**.' },
        { title: 'Die Akte eines Anbieters', text: 'Ein Klick öffnet die Akte: **nach Funktion** (mit Tokens für Claude), Verlauf pro Tag, verbrauchsstärkste Konten, vorausbezahlte Guthabenpakete und Abgleichsverlauf.' },
        { title: 'Kunden und Wiederverkäufer', text: 'Für jedes Konto: eigene API-Kosten, Umsatz und **Beitrag**. Bei einem Wiederverkäufer werden die Kosten **seiner Kunden** konsolidiert: Beitrag = Mieten + Aktivierungen − seine Kosten − die seiner Kunden. **CSV**-Export verfügbar.' },
        { title: 'Der tägliche Abgleich', text: 'Täglich vergleicht SPARK **sein eigenes Journal** mit dem, was der Anbieter auslesen lässt (ohne Guthaben zu verbrauchen). Eine **Abweichung** über dem in **Einstellungen › Warnungen und Schwellen** festgelegten Schwellenwert löst eine Warnung aus: nicht erfasste Aufrufe oder Tarifänderung.' },
      ],
    },
  },
};
