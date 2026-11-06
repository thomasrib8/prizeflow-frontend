import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import './rules.css';

// Public page of a game's rules, /rules/<campaign id>: read by participants before they play (link at the bottom of the guest form) and by anyone
// who asks for it. No login. The text is generated and frozen when the campaign starts (backend services/gameRules.js).
export default function RulesPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPublicRules(id).then(setDoc).catch(() => setError('not-found'));
  }, [id]);
  useEffect(() => { if (doc) document.title = `${doc.title} — ${doc.gameName}`; }, [doc]);

  if (error) return <div className="rl-page"><div className="rl-sheet"><h1>Règlement du jeu</h1><p>Aucun règlement n’est publié pour ce jeu.</p></div></div>;
  if (!doc) return <div className="rl-page"><div className="rl-sheet"><p>Chargement…</p></div></div>;

  const generated = new Date(doc.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="rl-page">
      <article className="rl-sheet">
        <header className="rl-head">
          <p className="rl-kicker">{doc.title}</p>
          <h1>« {doc.gameName} »</h1>
          <p className="rl-sub">{doc.subtitle}</p>
          <p className="rl-version">Version {doc.version} — {generated}</p>
          <button type="button" className="rl-print" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
        </header>

        {doc.articles.map((a) => (
          <section key={a.heading} className="rl-art">
            <h2>{a.heading}</h2>
            {a.blocks.map((b, i) => (b.type === 'list'
              ? <ul key={i}>{b.items.map((it, k) => <li key={k}>{it}</li>)}</ul>
              : <p key={i}>{b.text}</p>))}
          </section>
        ))}

        <section className="rl-art rl-annex">
          <h2>{doc.annex.heading}</h2>
          <p>{doc.annex.intro}</p>
          <div className="rl-table-wrap">
            <table>
              <thead><tr>{doc.annex.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {doc.annex.rows.map((r) => (
                  <tr key={r.case}><td>{r.case}</td><td>{r.gift}</td><td>{r.quantity}</td><td>{r.probability}</td></tr>
                ))}
                <tr className="rl-total"><td colSpan={doc.annex.columns.length - 1}>Total</td><td>{doc.annex.total}</td></tr>
              </tbody>
            </table>
          </div>
          {doc.annex.note && <p>{doc.annex.note}</p>}
        </section>
      </article>
    </div>
  );
}
