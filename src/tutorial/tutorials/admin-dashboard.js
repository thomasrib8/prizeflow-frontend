// Tutorial (administrators): the Dashboard Admin — revenue, recurring revenue, park use, rankings, and what is still to complete.
const cardOf = (n) => () => document.querySelectorAll('.mt-card')[n] || null;
const stat = (n) => () => document.querySelectorAll('.stat')[n] || null;
const infoBtn = () => document.querySelector('.stat button.link-button');

export default {
  id: 'admin-dashboard',
  icon: 'chart',
  device: 'desktop',
  admin: true,
  start: '/admin-dashboard',
  steps: [
    { async run(c) { await c.waitFor('.grid-stats'); await c.sleep(700); await c.point('.page-header', 1600); await c.point(cardOf(0), 2600); } },
    { async run(c) { await c.point(stat(0), 2200); await c.point(stat(1), 1800); await c.point(stat(2), 2000); await c.point(stat(3), 2400); } },
    { async run(c) { await c.click(infoBtn); await c.sleep(500); await c.point(stat(0), 3600); await c.click(infoBtn); } },
    { async run(c) { await c.point(stat(4), 1800); await c.point(stat(6), 2400); await c.point(stat(7), 2000); } },
    { async run(c) { await c.point('.error-banner', 3000); } },
    { async run(c) { await c.point('.recharts-wrapper', 3200); await c.point(cardOf(2), 2600); } },
  ],
  texts: {
    fr: {
      title: 'Le Dashboard Admin : le cockpit de SPARK',
      summary: 'Chiffre d’affaires, prévisionnel, récurrent, utilisation du parc, classements et données à compléter, sur la période de votre choix.',
      steps: [
        { title: 'Choisir la période', text: 'Le menu **Dashboard Admin** (administrateurs) suit la **période** choisie : aujourd’hui, 30 jours, mois en cours, année, depuis le lancement ou des dates libres. La **comparaison** se fait avec la période précédente de même durée. Les filtres **modèle** et **revendeur** se mémorisent dans l’adresse de la page.' },
        { title: 'Les quatre chiffres clés', text: '**CA reconnu** (ce qui est acquis), **prévisionnel à venir** (loyers à échéance et locations planifiées), **revenu récurrent mensuel** et **contribution après coûts API**. Ces niveaux ne sont **jamais additionnés** entre eux.' },
        { title: 'Fiabilité et formule', text: 'Chaque chiffre porte une étiquette : **réel**, **calculé**, **estimé** ou **incomplet**. Le petit **ⓘ** affiche sa **formule et sa source** : aucun chiffre n’est un mystère.' },
        { title: 'Locations, parc et clients', text: 'Nombre de locations, **taux d’utilisation du parc** (loué, puis réel d’après les tirages), clients actifs, revendeurs, activations, ratio **coûts API / CA** et nombre de roues ayant **couvert leur coût**.' },
        { title: 'Les données à compléter', text: 'Le bandeau jaune liste ce qui manque pour que les chiffres soient complets : un client sans conditions commerciales, une roue sans coût du lot, des appels API sans tarif. **Rien n’est jamais compté à zéro par défaut.**' },
        { title: 'Graphiques et classements', text: 'Évolution du CA **par modèle** (courte durée, longue durée, loyers revendeurs, activations), coûts API contre CA, **top clients, revendeurs et roues**. Le bouton **Exporter (CSV)** sort les chiffres de la période.' },
      ],
    },
    en: {
      title: 'The Admin Dashboard: the SPARK cockpit',
      summary: 'Revenue, forecast, recurring revenue, park use, rankings and what is still to complete, over the period you choose.',
      steps: [
        { title: 'Choose the period', text: 'The **Admin Dashboard** menu (administrators) follows the chosen **period**: today, 30 days, current month, year, since launch or free dates. The **comparison** is with the previous period of the same length. The **model** and **reseller** filters are kept in the page address.' },
        { title: 'The four key figures', text: '**Recognized revenue** (what is earned), **upcoming forecast** (rents falling due and planned rentals), **monthly recurring revenue** and **contribution after API costs**. These levels are **never added** together.' },
        { title: 'Reliability and formula', text: 'Every figure carries a label: **real**, **computed**, **estimated** or **incomplete**. The small **ⓘ** shows its **formula and source**: no figure is a mystery.' },
        { title: 'Rentals, park and clients', text: 'Number of rentals, **park utilization** (rented, then real from the draws), active clients, resellers, activations, **API costs / revenue** ratio and the number of wheels that have **covered their cost**.' },
        { title: 'What is still to complete', text: 'The yellow banner lists what is missing for the figures to be complete: a client without commercial conditions, a wheel without a lot cost, API calls without a tariff. **Nothing is ever counted as zero by default.**' },
        { title: 'Charts and rankings', text: 'Revenue **by model** (short term, long term, reseller rents, activations), API costs against revenue, **top clients, resellers and wheels**. The **Export (CSV)** button saves the figures of the period.' },
      ],
    },
    es: {
      title: 'El Dashboard Admin: el cockpit de SPARK',
      summary: 'Ingresos, previsión, recurrente, uso del parque, clasificaciones y lo que falta por completar, en el periodo que elija.',
      steps: [
        { title: 'Elegir el periodo', text: 'El menú **Dashboard Admin** (administradores) sigue el **periodo** elegido: hoy, 30 días, mes en curso, año, desde el lanzamiento o fechas libres. La **comparación** es con el periodo anterior de igual duración. Los filtros **modelo** y **revendedor** se guardan en la dirección de la página.' },
        { title: 'Las cuatro cifras clave', text: '**Ingresos reconocidos** (lo ganado), **previsión próxima** (alquileres a vencer y alquileres planificados), **ingresos recurrentes mensuales** y **contribución tras costes API**. Estos niveles **nunca se suman** entre sí.' },
        { title: 'Fiabilidad y fórmula', text: 'Cada cifra lleva una etiqueta: **real**, **calculado**, **estimado** o **incompleto**. La pequeña **ⓘ** muestra su **fórmula y fuente**: ninguna cifra es un misterio.' },
        { title: 'Alquileres, parque y clientes', text: 'Número de alquileres, **utilización del parque** (alquilado y luego real según los sorteos), clientes activos, revendedores, activaciones, ratio **costes API / ingresos** y ruedas que han **cubierto su coste**.' },
        { title: 'Lo que falta por completar', text: 'El aviso amarillo enumera lo que falta para que las cifras estén completas: un cliente sin condiciones comerciales, una rueda sin coste del lote, llamadas API sin tarifa. **Nunca se cuenta nada como cero por defecto.**' },
        { title: 'Gráficos y clasificaciones', text: 'Evolución de ingresos **por modelo** (corta duración, larga duración, alquileres de revendedores, activaciones), costes API frente a ingresos, **top de clientes, revendedores y ruedas**. El botón **Exportar (CSV)** guarda las cifras del periodo.' },
      ],
    },
    de: {
      title: 'Das Admin-Dashboard: das SPARK-Cockpit',
      summary: 'Umsatz, Prognose, wiederkehrender Umsatz, Parkauslastung, Ranglisten und noch zu Ergänzendes, für den gewählten Zeitraum.',
      steps: [
        { title: 'Zeitraum wählen', text: 'Das Menü **Admin-Dashboard** (Administratoren) folgt dem gewählten **Zeitraum**: heute, 30 Tage, laufender Monat, Jahr, seit dem Start oder freie Daten. Der **Vergleich** erfolgt mit dem vorherigen Zeitraum gleicher Länge. Die Filter **Modell** und **Wiederverkäufer** bleiben in der Adresse der Seite erhalten.' },
        { title: 'Die vier Kennzahlen', text: '**Erfasster Umsatz** (das Verdiente), **kommende Prognose** (fällige Mieten und geplante Vermietungen), **monatlich wiederkehrender Umsatz** und **Beitrag nach API-Kosten**. Diese Ebenen werden **nie addiert**.' },
        { title: 'Verlässlichkeit und Formel', text: 'Jede Zahl trägt ein Etikett: **real**, **berechnet**, **geschätzt** oder **unvollständig**. Das kleine **ⓘ** zeigt **Formel und Quelle**: keine Zahl ist ein Rätsel.' },
        { title: 'Vermietungen, Park und Kunden', text: 'Anzahl der Vermietungen, **Parkauslastung** (vermietet, dann real anhand der Ziehungen), aktive Kunden, Wiederverkäufer, Aktivierungen, Verhältnis **API-Kosten / Umsatz** und Zahl der Räder mit **gedeckten Kosten**.' },
        { title: 'Noch zu ergänzen', text: 'Das gelbe Banner listet auf, was für vollständige Zahlen fehlt: ein Kunde ohne Geschäftskonditionen, ein Rad ohne Loskosten, API-Aufrufe ohne Tarif. **Nichts wird je standardmäßig als null gezählt.**' },
        { title: 'Diagramme und Ranglisten', text: 'Umsatz **nach Modell** (Kurzzeit, Langzeit, Wiederverkäufer-Mieten, Aktivierungen), API-Kosten gegen Umsatz, **Top-Kunden, -Wiederverkäufer und -Räder**. Die Schaltfläche **Exportieren (CSV)** speichert die Zahlen des Zeitraums.' },
      ],
    },
  },
};
