import { useTranslation } from 'react-i18next';

// The "AI note" on a prospect's card (services/salesAssistant): what the
// assistant filled into the record from the rep's note (segments, sales
// fields, lead rating, tag), then what it could NOT place — values it left
// alone because the rep had set another, points that fit no field — plus
// questions worth asking and suggested next steps. Read-only: the assistant
// writes its values itself (routes/account.js POST /ai-assistant/analyze),
// so there is nothing to accept here, only a link to run it again.
//
// Older stored analyses (from when the rep had to accept each proposal)
// only carry summary/missingInfo/nextActions — every other list below
// simply defaults to empty for them.
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function formatValue(value) {
  if (typeof value === 'string' && DATETIME_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
  return String(value);
}

function itemText(item, t) {
  if (item.kind === 'rating') return t('aiSuggestionsPanel.leadRatingLabel', { stars: '★'.repeat(item.value) + '☆'.repeat(3 - item.value) });
  if (item.kind === 'tag') return t('aiSuggestionsPanel.tagLabel', { tag: item.value });
  return `${item.label}: ${formatValue(item.value)}`;
}

const sectionTitle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5B21B6', marginBottom: 4 };

export default function AISuggestionsPanel({ suggestions, analyzedNote, currentNote, analyzing, onAnalyze }) {
  const { t } = useTranslation('admin');

  const stale = !!suggestions && analyzedNote != null && currentNote.trim() !== (analyzedNote || '').trim();
  const neverAnalyzed = !suggestions;
  const applied = suggestions?.applied || [];
  const toCheck = suggestions?.toCheck || [];
  const unmapped = suggestions?.unmappedInfo || [];

  return (
    <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#5B21B6' }}>{t('aiSuggestionsPanel.title')}</div>
        {!analyzing && (
          <button
            type="button"
            onClick={onAnalyze}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#5B21B6', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
          >
            {neverAnalyzed ? t('aiSuggestionsPanel.analyzeLink') : t('aiSuggestionsPanel.reanalyzeLink')}
          </button>
        )}
      </div>

      {analyzing && <div style={{ fontSize: 13, color: '#5B21B6' }}>{t('aiSuggestionsPanel.analyzing')}</div>}

      {!analyzing && stale && (
        <div style={{ fontSize: 12, color: '#B45309', marginBottom: 10 }}>{t('aiSuggestionsPanel.staleWarning')}</div>
      )}

      {!analyzing && neverAnalyzed && (
        <div style={{ fontSize: 12, color: '#64748B' }}>{t('aiSuggestionsPanel.neverAnalyzed')}</div>
      )}

      {!analyzing && suggestions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.summary && <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{suggestions.summary}</p>}

          {applied.length > 0 && (
            <div>
              <div style={sectionTitle}>{t('aiSuggestionsPanel.filledTitle')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {applied.map((item, i) => (
                  <span key={i} style={{ background: 'white', border: '1px solid #DDD6FE', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#4C1D95', overflowWrap: 'anywhere' }}>
                    {itemText(item, t)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {toCheck.length > 0 && (
            <div>
              <div style={{ ...sectionTitle, color: '#B45309' }}>{t('aiSuggestionsPanel.toCheckTitle')}</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                {toCheck.map((item, i) => (
                  <li key={i}>
                    <strong>{itemText(item, t)}</strong>
                    {' — '}
                    <span style={{ color: '#64748B' }}>{t(item.reason === 'conflict' ? 'aiSuggestionsPanel.reasonConflict' : 'aiSuggestionsPanel.reasonLowConfidence')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {unmapped.length > 0 && (
            <div>
              <div style={sectionTitle}>{t('aiSuggestionsPanel.unmappedTitle')}</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                {unmapped.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          )}

          {suggestions.missingInfo?.length > 0 && (
            <div>
              <div style={sectionTitle}>{t('aiSuggestionsPanel.worthAskingTitle')}</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                {suggestions.missingInfo.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {suggestions.nextActions?.length > 0 && (
            <div>
              <div style={sectionTitle}>{t('aiSuggestionsPanel.nextStepsTitle')}</div>
              {suggestions.nextActions.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 2, lineHeight: 1.5 }}>
                  <strong>{a.title}</strong>{a.description ? ` — ${a.description}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
