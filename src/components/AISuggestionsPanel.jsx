import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';

// Renders the last AI analysis of a prospect's note (services/salesAssistant)
// inside ProspectCard.jsx — summary, proposed CRM updates the rep can accept
// or ignore one at a time (or all at once), missing-info questions worth
// asking, and suggested next steps. Nothing here writes anything itself —
// onApply/onDismiss are provided by ProspectCard.jsx, which calls the
// backend and updates its own field/segment/tag/rating state once a
// proposal is accepted.
export default function AISuggestionsPanel({ suggestions, analyzedNote, currentNote, analyzing, onAnalyze, onApply, onDismiss }) {
  const { t } = useTranslation('admin');
  const [busyId, setBusyId] = useState(null);

  const stale = !!suggestions && analyzedNote != null && currentNote.trim() !== (analyzedNote || '').trim();
  const neverAnalyzed = !suggestions;

  async function handle(action, id) {
    setBusyId(id);
    try {
      await action(id);
    } finally {
      setBusyId(null);
    }
  }

  const pendingItems = suggestions
    ? [
        ...suggestions.fieldUpdates.filter((i) => i.status === 'pending').map((i) => ({ ...i, kind: 'field' })),
        ...suggestions.segmentUpdates.filter((i) => i.status === 'pending').map((i) => ({ ...i, kind: 'segment' })),
        ...(suggestions.leadRating?.status === 'pending' ? [{ ...suggestions.leadRating, kind: 'rating' }] : []),
        ...(suggestions.suggestedTag?.status === 'pending' ? [{ ...suggestions.suggestedTag, kind: 'tag' }] : []),
      ]
    : [];

  async function applyAll() {
    // Sequential, not Promise.all — each accept is its own small write on
    // the backend (see PATCH /account/ai-assistant/suggestions), so this
    // just fires them one after another rather than in parallel.
    for (const item of pendingItems) {
      // eslint-disable-next-line no-await-in-loop
      await handle(onApply, item.id);
    }
  }

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
        <div style={{ fontSize: 12, color: '#B45309', marginBottom: 10 }}>
          {t('aiSuggestionsPanel.staleWarning')}
        </div>
      )}

      {!analyzing && neverAnalyzed && (
        <div style={{ fontSize: 12, color: '#64748B' }}>{t('aiSuggestionsPanel.neverAnalyzed')}</div>
      )}

      {!analyzing && suggestions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.summary && <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>{suggestions.summary}</p>}

          {pendingItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingItems.map((item) => (
                <SuggestionItem
                  key={item.id}
                  item={item}
                  t={t}
                  busy={busyId === item.id}
                  onApply={() => handle(onApply, item.id)}
                  onDismiss={() => handle(onDismiss, item.id)}
                />
              ))}
              {pendingItems.length > 1 && (
                <Button type="button" size="sm" onClick={applyAll}>{t('aiSuggestionsPanel.applyAllBtn')}</Button>
              )}
            </div>
          )}

          {suggestions.missingInfo?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5B21B6', marginBottom: 4 }}>{t('aiSuggestionsPanel.worthAskingTitle')}</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                {suggestions.missingInfo.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {suggestions.nextActions?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5B21B6', marginBottom: 4 }}>{t('aiSuggestionsPanel.nextStepsTitle')}</div>
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

function itemLabel(item, t) {
  if (item.kind === 'field') return `${item.fieldLabel}: ${item.value}`;
  if (item.kind === 'segment') return `${item.categoryName}: ${item.optionLabel}`;
  if (item.kind === 'rating') return t('aiSuggestionsPanel.leadRatingLabel', { stars: '★'.repeat(item.value) + '☆'.repeat(3 - item.value) });
  if (item.kind === 'tag') return t('aiSuggestionsPanel.newTagLabel', { tag: item.tag });
  return '';
}

function SuggestionItem({ item, t, busy, onApply, onDismiss }) {
  return (
    <div style={{ background: 'white', borderRadius: 8, padding: 10, border: '1px solid #EDE9FE' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#03041A' }}>{itemLabel(item, t)}</div>
      {item.reasoning && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 1.4 }}>{item.reasoning}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button type="button" size="sm" disabled={busy} onClick={onApply}>{busy ? '…' : t('aiSuggestionsPanel.acceptBtn')}</Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onDismiss}>{t('aiSuggestionsPanel.ignoreBtn')}</Button>
      </div>
    </div>
  );
}
