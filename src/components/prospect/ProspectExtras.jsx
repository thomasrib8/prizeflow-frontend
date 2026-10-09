// The prospect card's secondary sections: history (what SPARK really recorded), the other campaigns this
// contact is in, and dated manual notes. Desktop shows them in the right-hand column; the phone stacks them
// under "Informations principales", collapsible. History and campaigns come from the cloud, so the event box
// (the offline app) simply doesn't show them; manual notes work in both.
import { useState } from 'react';
import { IcClock, IcFolder, IcNote, IcChevron } from './icons';

// SQLite timestamps are UTC "YYYY-MM-DD HH:MM:SS" (no zone); anything already carrying a zone is left alone.
function parseWhen(value) {
  if (!value) return null;
  const s = String(value);
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
const fmtDate = (v) => parseWhen(v)?.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) || '';
const fmtDateTime = (v) => parseWhen(v)?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) || '';

function eventLabel(ev, t) {
  const d = ev.detail || {};
  const stars = (n) => (n == null ? t('prospect.ev_rating_none') : t('prospect.ev_rating_stars', { count: n }));
  switch (ev.type) {
    case 'played': return t('prospect.ev_played', { gift: d.gift || '—' });
    case 'gift_email_sent': return t('prospect.ev_gift_email_sent', { gift: d.gift || '—' });
    case 'consent': return d.by ? t('prospect.ev_consent_by', { name: d.by }) : t('prospect.ev_consent');
    case 'rating_changed': return t('prospect.ev_rating_changed', { from: stars(d.from), to: stars(d.to) });
    case 'reward_voided': return t('prospect.ev_reward_voided', { gift: d.gift || '—' });
    case 'offline_edit': return d.merged ? t('prospect.ev_offline_merged') : t('prospect.ev_offline_edit');
    case 'created': case 'created_manual': case 'note_updated': case 'tags_changed': case 'fields_changed':
    case 'ai_analyzed': case 'manual_note_added': case 'email_added': case 'linkedin_changed':
      return t(`prospect.ev_${d.manual && ev.type === 'created' ? 'created_manual' : ev.type}`);
    default: return null; // a type this version doesn't know: leave it out rather than show a raw code
  }
}

const SHORT = 5;

export function ProspectHistory({ c }) {
  const { t } = c;
  const [all, setAll] = useState(false);
  if (c.history === null) return null;
  const events = c.history.map((ev) => ({ ev, label: ev.type === 'ai_analyzed' && !c.aiOn ? null : eventLabel(ev, t) })).filter((x) => x.label);
  const shown = all ? events : events.slice(0, SHORT);
  return (
    <section className="pc-card pc-extra">
      <h3 className="pc-card-title"><IcClock className="pc-title-ic" />{t('prospect.history')}</h3>
      {events.length === 0 ? <p className="pc-extra-empty">{t('prospect.historyEmpty')}</p> : (
        <ol className="pc-timeline">
          {shown.map(({ ev, label }, i) => (
            <li key={`${ev.at}-${ev.type}-${i}`}>
              <span className="pc-tl-label">{label}</span>
              <span className="pc-tl-date">{fmtDateTime(ev.at)}</span>
            </li>
          ))}
        </ol>
      )}
      {events.length > SHORT && (
        <button type="button" className="pc-linkbtn" onClick={() => setAll((v) => !v)}>{all ? t('prospect.historyLess') : t('prospect.historyMore')}</button>
      )}
    </section>
  );
}

export function ProspectCampaigns({ c }) {
  const { t } = c;
  if (c.otherCampaigns === null) return null;
  const list = c.otherCampaigns;
  const onlyThis = list.length <= 1 && list.every((x) => x.campaignId === c.campaignId);
  return (
    <section className="pc-card pc-extra">
      <h3 className="pc-card-title"><IcFolder className="pc-title-ic" />{t('prospect.campaigns')}</h3>
      {onlyThis ? <p className="pc-extra-empty">{t('prospect.campaignsEmpty')}</p> : (
        <ul className="pc-camps">
          {list.map((x) => {
            const date = fmtDate(x.since);
            const how = x.how === 'played' ? t('prospect.campaignPlayed', { date }) : x.manual ? t('prospect.campaignAddedManual', { date }) : t('prospect.campaignAdded', { date });
            return (
              <li key={x.campaignId} className={x.campaignId === c.campaignId ? 'current' : ''}>
                <strong>{x.name}</strong>
                <span className="pc-tl-date">{x.campaignId === c.campaignId ? `${t('prospect.campaignCurrent')} · ` : ''}{how}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ProspectManualNotes({ c, offline }) {
  const { t } = c;
  const [text, setText] = useState('');
  if (c.manualNotes === null) return null;
  async function submit(e) {
    e.preventDefault();
    if (await c.addManualNote(text)) setText('');
  }
  return (
    <section className="pc-card pc-extra">
      <h3 className="pc-card-title"><IcNote className="pc-title-ic" />{t('prospect.manualNotes')}</h3>
      <form className="pc-mn-form" onSubmit={submit}>
        <textarea className="pc-textarea" rows={2} maxLength={5000} value={text} placeholder={t('prospect.manualNotePlaceholder')} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="pc-editbtn" disabled={c.addingNote || !text.trim()}>{c.addingNote ? t('prospect.manualNoteAdding') : t('prospect.manualNoteAdd')}</button>
      </form>
      {c.noteError && <div className="pc-aierror">{c.noteError}</div>}
      {offline && <p className="pc-extra-hint">{t('prospect.manualNoteOffline')}</p>}
      {c.manualNotes.length === 0 ? <p className="pc-extra-empty">{t('prospect.manualNotesEmpty')}</p> : (
        <ul className="pc-mn-list">
          {c.manualNotes.map((n) => (
            <li key={n.id}>
              <span className="pc-tl-date">{fmtDateTime(n.createdAt)}</span>
              <p>{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Phone: the same three sections, each folded away by default except the notes, so the card stays short.
export function ProspectExtrasMobile({ c, offline }) {
  const { t } = c;
  const parts = [
    !offline && c.history !== null && { key: 'history', title: t('prospect.history'), node: <ProspectHistory c={c} /> },
    !offline && c.otherCampaigns !== null && { key: 'campaigns', title: t('prospect.campaigns'), node: <ProspectCampaigns c={c} /> },
    c.manualNotes !== null && { key: 'notes', title: t('prospect.manualNotes'), node: <ProspectManualNotes c={c} offline={offline} />, open: true },
  ].filter(Boolean);
  return (
    <div className="pc-only-mobile pc-extras">
      {parts.map((p) => (
        <details key={p.key} className="pc-fold" open={!!p.open}>
          <summary><span>{p.title}</span><IcChevron className="pc-fold-chev" /></summary>
          {p.node}
        </details>
      ))}
    </div>
  );
}
