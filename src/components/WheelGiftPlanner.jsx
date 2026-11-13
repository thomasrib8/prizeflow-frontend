import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, MiniBar } from './ui';
import WheelSVG from './WheelSVG';
import { SLOT_COLORS } from './slotColors';
import { CASE_COUNT, isGiftReady } from './giftPlanning';
import { DistributionBar, ProbabilityTotal, TopCaseWarning } from './DynamicCaseFields';
import VariantsEditor, { PersoFields, emptyVariant } from './VariantsEditor';
import UniqueCodesPanel from './UniqueCodesPanel';
import './dynamic-distribution.css';

// Step 1 of campaign creation: define 12 gifts first (name, how it's
// redeemed, stock) with no position yet, then drag each one onto a case of
// the wheel drawing. A gift can only be placed once; the step is complete
// only when all 12 cases are filled (the parent enforces that).
//
// Dragging uses pointer events rather than the HTML5 drag-and-drop API, which
// doesn't work on touch screens. Each wheel section carries data-case (see
// WheelSVG.jsx), so a drag hit-tests whatever is under the pointer. Every
// unplaced, ready gift also has a "Place in case" select as a non-drag way
// to do the same thing.
// Editing an existing draft: `campaignId` lets the unique-codes panels reach the codes already saved, and `isPinned(gift)` marks a gift that cannot be
// moved to another case (its saved codes belong to its case).
export default function WheelGiftPlanner({ gifts, setGifts, wheelProps, wheelCaption, headerAction, dynamic = false, campaignId = null, onCodesChanged = () => {}, isPinned = () => false }) {
  const { t } = useTranslation('admin');
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;
  const [drag, setDrag] = useState(null); // { id, name, x, y, over }
  // "Reduce details": every gift shrinks to its one line (case, name, probability, stock); the arrow at the end of a line opens that gift's details.
  const [compact, setCompact] = useState(false);
  const [opened, setOpened] = useState(() => new Set());
  const showDetails = (g) => !compact || opened.has(g.id);
  const toggleOpen = (id) => setOpened((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleCompact = () => { setCompact((c) => !c); setOpened(new Set()); };

  const totalStock = gifts.reduce((sum, g) => sum + (Number(g.stock) || 0), 0);
  const placedCount = gifts.filter((g) => g.caseIndex !== null).length;
  const giftByCase = Array.from({ length: CASE_COUNT }, (_, c) => gifts.find((g) => g.caseIndex === c) || null);
  const freeCases = giftByCase.map((g, c) => (g ? null : c)).filter((c) => c !== null);

  const sectionStyles = giftByCase.map((g, c) => (
    g
      ? { fill: SLOT_COLORS[c], title: t('wheelGiftPlanner.caseGiftTitle', { n: c + 1, name: g.giftName, stock: Number(g.stock) || 0 }) }
      : { title: t('wheelGiftPlanner.emptyCaseTitle', { n: c + 1 }) }
  ));

  function updateGift(id, field, value) {
    setGifts((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  }

  function patchGift(id, patch) {
    setGifts((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function place(id, c) {
    const current = giftsRef.current;
    if (current.some((g) => g.caseIndex === c)) return; // case already taken
    const gift = current.find((g) => g.id === id);
    if (!gift || gift.caseIndex !== null || !isGiftReady(gift, dynamic)) return;
    setGifts((prev) => prev.map((g) => (g.id === id ? { ...g, caseIndex: c } : g)));
  }

  function unplace(id) {
    setGifts((prev) => prev.map((g) => (g.id === id ? { ...g, caseIndex: null } : g)));
  }

  // The free case under a screen point, or null (off the wheel, or taken).
  function freeCaseAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const node = el && el.closest ? el.closest('[data-case]') : null;
    if (!node) return null;
    const c = Number(node.getAttribute('data-case'));
    return giftsRef.current.some((g) => g.caseIndex === c) ? null : c;
  }

  function startDrag(e, gift) {
    if (e.button !== undefined && e.button !== 0) return;
    if (gift.caseIndex !== null || !isGiftReady(gift, dynamic)) return;
    e.preventDefault();

    const update = (ev) => setDrag({ id: gift.id, name: gift.giftName, x: ev.clientX, y: ev.clientY, over: freeCaseAt(ev.clientX, ev.clientY) });
    const cleanup = () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
    };
    function end(ev) {
      cleanup();
      const c = freeCaseAt(ev.clientX, ev.clientY);
      setDrag(null);
      if (c !== null) place(gift.id, c);
    }
    function cancel() {
      cleanup();
      setDrag(null);
    }
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
    update(e);
  }

  return (
    <div className="planner-layout">
      <div className="planner-wheel">
        <Card title={t('wheelGiftPlanner.yourWheelTitle')}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <WheelSVG
              size={300}
              sectionStyles={sectionStyles}
              dropTarget={drag ? drag.over : null}
              {...wheelProps}
            />
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: placedCount === CASE_COUNT ? '#059669' : '#334155', marginBottom: 6 }}>
                <span>{placedCount === CASE_COUNT ? t('wheelGiftPlanner.wheelCompleteLabel') : t('wheelGiftPlanner.casesFilledLabel')}</span>
                <span>{placedCount} / {CASE_COUNT}</span>
              </div>
              <MiniBar pct={(placedCount / CASE_COUNT) * 100} color={placedCount === CASE_COUNT ? '#10B981' : '#09B2FD'} />
            </div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, textAlign: 'center' }}>{wheelCaption}</div>
          </div>
        </Card>
      </div>

      <Card title={t('editCampaign.giftsTitle')} action={<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{headerAction}<button type="button" className="btn btn-ghost btn-sm" aria-pressed={compact} onClick={toggleCompact}>{compact ? t('wheelGiftPlanner.expandAll') : t('wheelGiftPlanner.collapseAll')}</button>{dynamic && <ProbabilityTotal values={gifts.filter((g) => g.giftName.trim()).map((g) => g.probability)} />}<span className="badge badge-blue">{t('wheelGiftPlanner.totalStockLabel', { n: totalStock })}</span></div>}>
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
          {t('wheelGiftPlanner.instructionsIntro')} <b>{t('wheelGiftPlanner.instructionsDragBold')}</b>{t('wheelGiftPlanner.instructionsRedeemIntro')} <b>QR</b> {t('wheelGiftPlanner.instructionsQrDesc')} <b>Code</b> {t('wheelGiftPlanner.instructionsCodeDesc')} <b>Voucher</b> {t('wheelGiftPlanner.instructionsVoucherDesc')} <b>Perso</b> {t('wheelGiftPlanner.instructionsPersoDesc')}
        </p>
        {dynamic && <p className="dyn-help">{t('dynamic.plannerHelp')}</p>}
        {dynamic && <DistributionBar items={gifts.filter((g) => g.giftName.trim()).map((g) => ({ key: g.id, label: g.giftName.trim(), color: SLOT_COLORS[(g.caseIndex !== null ? g.caseIndex : g.id) % SLOT_COLORS.length], value: g.probability }))} />}
        {dynamic && <TopCaseWarning items={gifts.map((g) => ({ used: !!g.giftName.trim(), probability: g.probability, unlimited: g.unlimited }))} />}
        <div className="gift-list">
          {gifts.map((g) => {
            const placed = g.caseIndex !== null;
            const ready = isGiftReady(g, dynamic);
            const draggable = !placed && ready;
            const pct = totalStock ? ((Number(g.stock) || 0) / totalStock) * 100 : 0;
            return (
              <div key={g.id} className={`gift-card${placed ? ' placed' : ''}`}>
                <div className="gift-row-wrap">
                <div className={`gift-row${dynamic ? ' dyn' : ''}`}>
                  <div
                    className={`gift-handle${draggable ? ' ready' : ''}${placed ? ' placed' : ''}`}
                    onPointerDown={(e) => startDrag(e, g)}
                    role="button"
                    aria-disabled={!draggable}
                    title={placed ? t('wheelGiftPlanner.placedOnCaseTitle', { n: g.caseIndex + 1 }) : ready ? t('wheelGiftPlanner.dragMeHint') : t('wheelGiftPlanner.addNameStockHint')}
                    style={placed ? { background: SLOT_COLORS[g.caseIndex], color: 'white' } : undefined}
                  >
                    {placed ? t('wheelGiftPlanner.placedCaseBadge', { n: g.caseIndex + 1 }) : draggable ? t('wheelGiftPlanner.dragBadge') : t('wheelGiftPlanner.giftNumberBadge', { n: g.id + 1 })}
                  </div>
                  <input className="dyn-name" placeholder={t('editCampaign.giftNamePlaceholder')} value={g.giftName} onChange={(e) => updateGift(g.id, 'giftName', e.target.value)} />
                  {/* dynamic method: probability of the case (%), then its stock or "Illimité" — all on the same line */}
                  {dynamic && (
                    <label className="dyn-pct" title={t('dynamic.probability')}>
                      <input type="number" min="0" max="100" step="0.01" inputMode="decimal" placeholder="0" aria-label={t('dynamic.probability')} value={g.probability === 0 || g.probability === undefined ? '' : g.probability} onChange={(e) => updateGift(g.id, 'probability', e.target.value)} />
                      <span>%</span>
                    </label>
                  )}
                  <input className="dyn-stock" type="number" min="0" placeholder={dynamic && g.unlimited ? t('dynamic.unlimitedShort') : t('wheelGiftPlanner.stockPlaceholder')} value={dynamic && g.unlimited ? '' : (g.stock || '')} disabled={dynamic && !!g.unlimited} onChange={(e) => updateGift(g.id, 'stock', e.target.value)} />
                  {dynamic && (
                    <label className={`dyn-unl${g.unlimited ? ' on' : ''}`} title={t('dynamic.unlimitedHint')}>
                      <input type="checkbox" checked={!!g.unlimited} onChange={(e) => setGifts((prev) => prev.map((x) => (x.id === g.id ? { ...x, unlimited: e.target.checked, stock: e.target.checked ? 0 : x.stock } : x)))} />
                      <span>{t('dynamic.unlimitedShort')}</span>
                    </label>
                  )}
                  {g.variantsEnabled ? <span className="vr-flag dyn-redeem" title={t('variants.modeInVariants')}>{t('variants.modeInVariantsShort')}</span> : <select className="dyn-redeem" value={g.redeemMethod} title={t('editCampaign.redeemMethodTitle')} onChange={(e) => updateGift(g.id, 'redeemMethod', e.target.value)}>
                    <option value="qr">QR</option>
                    <option value="code">Code</option>
                    <option value="voucher">Voucher</option>
                    <option value="perso">Perso</option>
                  </select>}
                  {!dynamic && <div className="gift-pct">{pct ? `${pct.toFixed(1)}%` : '—'}</div>}
                </div>
                {compact && (
                  <button type="button" className={`gift-toggle${opened.has(g.id) ? ' open' : ''}`} aria-expanded={opened.has(g.id)}
                    title={opened.has(g.id) ? t('wheelGiftPlanner.hideDetails') : t('wheelGiftPlanner.showDetails')} aria-label={opened.has(g.id) ? t('wheelGiftPlanner.hideDetails') : t('wheelGiftPlanner.showDetails')} onClick={() => toggleOpen(g.id)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                )}
                </div>

                {showDetails(g) && (<>
                <div className="gift-place-row">
                  {placed ? (
                    <>
                      <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>{t('wheelGiftPlanner.placedOnCaseLabel', { n: g.caseIndex + 1 })}</span>
                      {isPinned(g)
                        ? <span style={{ fontSize: 12, color: '#94A3B8' }}>{t('wheelGiftPlanner.pinnedHint')}</span>
                        : <button type="button" className="gift-link-btn" onClick={() => unplace(g.id)}>{t('wheelGiftPlanner.removeFromWheelBtn')}</button>}
                    </>
                  ) : ready ? (
                    <>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{t('wheelGiftPlanner.dragOrLabel')}</span>
                      <select
                        aria-label={t('wheelGiftPlanner.placeInCaseAriaLabel', { n: g.id + 1 })}
                        value=""
                        onChange={(e) => { if (e.target.value !== '') place(g.id, Number(e.target.value)); }}
                        style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
                      >
                        <option value="">{t('wheelGiftPlanner.placeInCasePlaceholder')}</option>
                        {freeCases.map((c) => <option key={c} value={c}>{t('dashboard.caseLabel', { n: c + 1 })}</option>)}
                      </select>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{t('wheelGiftPlanner.addNameStockFullHint')}</span>
                  )}
                </div>

                {/* several gifts behind one case (variants) — not for an unlimited gift */}
                {(g.giftName.trim() || Number(g.stock) > 0) && !(dynamic && g.unlimited) && (
                  <label className="vr-toggle">
                    <input type="checkbox" checked={!!g.variantsEnabled}
                      onChange={(e) => patchGift(g.id, { variantsEnabled: e.target.checked, variants: e.target.checked && !(g.variants || []).length ? [emptyVariant()] : (g.variants || []) })} />
                    <span>{t('variants.enable')}</span>
                  </label>
                )}
                {!g.variantsEnabled && g.redeemMethod === 'perso' && (
                  <PersoFields value={g} idPrefix={`gift-${g.id}`} uniqueCodeEditable={!(dynamic && g.unlimited)} onChange={(field, value) => updateGift(g.id, field, value)}>
                    <UniqueCodesPanel campaignId={campaignId} slotIndex={g.caseIndex ?? g.id} stock={Number(g.stock) || 0} label={g.giftName || t('wheelGiftPlanner.giftNumberBadge', { n: g.id + 1 })} draft onChanged={onCodesChanged}
                      persisted={!!g.savedUnique} staged={g.pendingCodes || ''} onStage={(txt) => updateGift(g.id, 'pendingCodes', txt)} />
                  </PersoFields>
                )}
                {g.variantsEnabled && (
                  <VariantsEditor slot={{ ...g, slotIndex: g.caseIndex ?? g.id, stockInitial: g.stock }} draft campaignId={campaignId} onCodesChanged={onCodesChanged} onChange={(patch) => patchGift(g.id, patch)} />
                )}
                </>)}
              </div>
            );
          })}
        </div>
      </Card>

      {drag && (
        <div
          style={{
            position: 'fixed', left: drag.x + 14, top: drag.y + 14, zIndex: 1000, pointerEvents: 'none',
            background: '#03041A', color: 'white', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          }}
        >
          {drag.name}
        </div>
      )}
    </div>
  );
}
