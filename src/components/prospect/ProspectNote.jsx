// The "Note" card — the rep's current note about this prospect. Plain "Note", never "AI note": the assistant
// works in the background.
//   assistant off / not analysed yet / analysing / failed / note changed since → the ORIGINAL note, untouched
//   assistant on and analysis current → the rewritten note (only what the fields do not already carry),
//                                        with a link to read the original exactly as written
// The original lives in its own column and is never replaced by the analysis.
import { useEffect, useState } from 'react';
import { IcNote, IcSpark } from './icons';
import SuggestedNextSteps from './SuggestedNextSteps';

function toCheckText(item, t) {
  if (item.kind === 'rating') return t('aiSuggestionsPanel.leadRatingLabel', { stars: '★'.repeat(item.value) + '☆'.repeat(3 - item.value) });
  if (item.kind === 'tag') return t('aiSuggestionsPanel.tagLabel', { tag: item.value });
  return `${item.label}: ${item.value}`;
}

export default function ProspectNote({ c }) {
  const { t } = c;
  const [showOriginal, setShowOriginal] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  useEffect(() => { if (!c.hasReworked) setShowOriginal(false); }, [c.hasReworked]);

  const canViewOriginal = c.aiOn && c.hasReworked;
  const stepsAvailable = c.aiOn && c.nextActions.length > 0;
  const showingReworked = c.hasReworked && !showOriginal && !c.editing;
  const text = showingReworked ? c.reworkedText : c.note;

  return (
    <section className={`pc-card pc-note${c.aiOn ? ' ai' : ''}`}>
      <div className="pc-card-head">
        <h3 className="pc-card-title"><IcNote className="pc-title-ic" />{t('prospect.note')}</h3>
        <div className="pc-note-actions">
          {c.analyzing && <span className="pc-spin" role="status">{t('aiSuggestionsPanel.analyzing')}</span>}
          {stepsAvailable && !c.editing && (
            <button type="button" className={`pc-pill pc-only-mobile${stepsOpen ? ' open' : ''}`} onClick={() => setStepsOpen((v) => !v)} aria-expanded={stepsOpen}>
              {stepsOpen ? t('prospect.hideSteps') : t('prospect.viewSteps')}<span className="pc-pill-count">{c.nextActions.length}</span>
            </button>
          )}
        </div>
      </div>

      {c.editing ? (
        <>
          <textarea
            className="pc-textarea"
            rows={5}
            value={c.note}
            onChange={(e) => c.setNote(e.target.value)}
            placeholder={t('prospectCard.notePlaceholder')}
          />
          <div className="pc-note-tools">
            {c.canDictate && (c.recording ? (
              <>
                <button type="button" className="pc-rec on" onClick={c.stopRecording}>{t('prospectCard.stopRecording')}</button>
                <span className="pc-rec-hint">{t('prospectCard.recordingLabel')} <span>{t('prospectCard.recordingSilenceHint')}</span></span>
              </>
            ) : (
              <button type="button" className="pc-rec" onClick={c.startRecording}>{t('prospectCard.recordVoiceNote')}</button>
            ))}
            {c.aiOn && c.note.trim() && (
              <button type="button" className="pc-linkbtn ai" disabled={c.analyzing} onClick={c.handleAnalyze}>
                <IcSpark />{c.analysisFresh ? t('prospect.reanalyze') : t('prospect.analyze')}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {text ? (
            <p className="pc-note-text">{text}</p>
          ) : showingReworked ? (
            <p className="pc-note-text muted">{t('prospect.allInFields')}</p>
          ) : (
            <p className="pc-note-text muted">{t('prospect.noNote')}{' '}<button type="button" className="pc-linkbtn" onClick={c.startEdit}>{t('prospect.addNote')}</button></p>
          )}

          {showOriginal && c.hasReworked && <div className="pc-badge-original">{t('prospect.originalBadge')}</div>}

          <div className="pc-note-foot">
            {canViewOriginal && (
              <button type="button" className="pc-linkbtn" onClick={() => setShowOriginal((v) => !v)}>
                {showOriginal ? t('prospect.viewReworked') : t('prospect.viewOriginal')}
              </button>
            )}
            {c.aiOn && c.note.trim() && !c.analyzing && (c.analysisStale || !c.aiSuggestions) && (
              <>
                {c.analysisStale && <span className="pc-stale">{t('prospect.staleNote')}</span>}
                <button type="button" className="pc-linkbtn ai" onClick={c.handleAnalyze}><IcSpark />{c.analysisStale ? t('prospect.reanalyze') : t('prospect.analyze')}</button>
              </>
            )}
          </div>

          {c.aiError && (
            <div className="pc-aierror" role="alert">
              {t('prospect.analysisFailed')}{' '}
              <button type="button" className="pc-linkbtn" onClick={c.handleAnalyze}>{t('prospect.retry')}</button>
            </div>
          )}

          {c.toCheck.length > 0 && (
            <div className="pc-tocheck">
              <strong>{t('aiSuggestionsPanel.toCheckTitle')}</strong>
              <ul>
                {c.toCheck.map((item, i) => (
                  <li key={i}>{toCheckText(item, t)} <span>— {t(item.reason === 'conflict' ? 'aiSuggestionsPanel.reasonConflict' : 'aiSuggestionsPanel.reasonLowConfidence')}</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* phone: the steps open under the note on demand; desktop has its own card in the right column */}
          {stepsOpen && stepsAvailable && <div className="pc-only-mobile"><SuggestedNextSteps c={c} variant="inline" /></div>}
        </>
      )}
    </section>
  );
}
