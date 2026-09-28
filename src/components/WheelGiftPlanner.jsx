import { useRef, useState } from 'react';
import { Card, MiniBar } from './ui';
import WheelSVG from './WheelSVG';
import { SLOT_COLORS } from './slotColors';
import { CASE_COUNT, isGiftReady } from './giftPlanning';

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
export default function WheelGiftPlanner({ gifts, setGifts, wheelProps, wheelCaption, headerAction }) {
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;
  const [drag, setDrag] = useState(null); // { id, name, x, y, over }

  const totalStock = gifts.reduce((sum, g) => sum + (Number(g.stock) || 0), 0);
  const placedCount = gifts.filter((g) => g.caseIndex !== null).length;
  const giftByCase = Array.from({ length: CASE_COUNT }, (_, c) => gifts.find((g) => g.caseIndex === c) || null);
  const freeCases = giftByCase.map((g, c) => (g ? null : c)).filter((c) => c !== null);

  const sectionStyles = giftByCase.map((g, c) => (
    g
      ? { fill: SLOT_COLORS[c], title: `Case ${c + 1} — ${g.giftName} (stock ${Number(g.stock) || 0})` }
      : { title: `Case ${c + 1} — empty` }
  ));

  function updateGift(id, field, value) {
    setGifts((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  }

  function place(id, c) {
    const current = giftsRef.current;
    if (current.some((g) => g.caseIndex === c)) return; // case already taken
    const gift = current.find((g) => g.id === id);
    if (!gift || gift.caseIndex !== null || !isGiftReady(gift)) return;
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
    if (gift.caseIndex !== null || !isGiftReady(gift)) return;
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
        <Card title="Your wheel">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <WheelSVG
              size={300}
              sectionStyles={sectionStyles}
              dropTarget={drag ? drag.over : null}
              {...wheelProps}
            />
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: placedCount === CASE_COUNT ? '#059669' : '#334155', marginBottom: 6 }}>
                <span>{placedCount === CASE_COUNT ? '✓ Wheel complete' : 'Cases filled'}</span>
                <span>{placedCount} / {CASE_COUNT}</span>
              </div>
              <MiniBar pct={(placedCount / CASE_COUNT) * 100} color={placedCount === CASE_COUNT ? '#10B981' : '#09B2FD'} />
            </div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, textAlign: 'center' }}>{wheelCaption}</div>
          </div>
        </Card>
      </div>

      <Card title="Gifts" action={<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{headerAction}<span className="badge badge-blue">Total stock: {totalStock}</span></div>}>
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 12px' }}>
          Define your 12 gifts, then <b>drag each one onto a case of the wheel</b>. A gift turns green once placed and can't be placed twice.
          "Redeem" chooses how the guest confirms their gift: <b>QR</b> links straight to it, <b>Code</b> emails an 8-character code to type in on the Rewards page, <b>Voucher</b> just tells the guest to see a staff member for their physical voucher, <b>Perso</b> sends this gift's own custom email (choose what it delivers below).
        </p>
        <div className="gift-list">
          {gifts.map((g) => {
            const placed = g.caseIndex !== null;
            const ready = isGiftReady(g);
            const draggable = !placed && ready;
            const pct = totalStock ? ((Number(g.stock) || 0) / totalStock) * 100 : 0;
            return (
              <div key={g.id} className={`gift-card${placed ? ' placed' : ''}`}>
                <div className="gift-row">
                  <div
                    className={`gift-handle${draggable ? ' ready' : ''}${placed ? ' placed' : ''}`}
                    onPointerDown={(e) => startDrag(e, g)}
                    role="button"
                    aria-disabled={!draggable}
                    title={placed ? `Placed on case ${g.caseIndex + 1}` : ready ? 'Drag me onto a case of the wheel' : 'Add a name and a stock to place this gift'}
                    style={placed ? { background: SLOT_COLORS[g.caseIndex], color: 'white' } : undefined}
                  >
                    {placed ? `✓ Case ${g.caseIndex + 1}` : draggable ? '⠿ Drag' : `Gift ${g.id + 1}`}
                  </div>
                  <input placeholder="Gift name" value={g.giftName} onChange={(e) => updateGift(g.id, 'giftName', e.target.value)} />
                  <input type="number" min="0" placeholder="Stock" value={g.stock || ''} onChange={(e) => updateGift(g.id, 'stock', e.target.value)} />
                  <select value={g.redeemMethod} title="How the guest confirms their gift" onChange={(e) => updateGift(g.id, 'redeemMethod', e.target.value)}>
                    <option value="qr">QR</option>
                    <option value="code">Code</option>
                    <option value="voucher">Voucher</option>
                    <option value="perso">Perso</option>
                  </select>
                  <div className="gift-pct">{pct ? `${pct.toFixed(1)}%` : '—'}</div>
                </div>

                <div className="gift-place-row">
                  {placed ? (
                    <>
                      <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>Placed on case {g.caseIndex + 1}</span>
                      <button type="button" className="gift-link-btn" onClick={() => unplace(g.id)}>Remove from wheel</button>
                    </>
                  ) : ready ? (
                    <>
                      <span style={{ fontSize: 12, color: '#64748B' }}>Drag it onto the wheel, or</span>
                      <select
                        aria-label={`Place gift ${g.id + 1} in a case`}
                        value=""
                        onChange={(e) => { if (e.target.value !== '') place(g.id, Number(e.target.value)); }}
                        style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
                      >
                        <option value="">place in case…</option>
                        {freeCases.map((c) => <option key={c} value={c}>Case {c + 1}</option>)}
                      </select>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Add a name and a stock to be able to place this gift.</span>
                  )}
                </div>

                {g.redeemMethod === 'perso' && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div className="field" style={{ margin: 0, flex: '0 0 180px' }}>
                        <label style={{ fontSize: 11 }}>Delivers</label>
                        <select value={g.persoDelivery} onChange={(e) => updateGift(g.id, 'persoDelivery', e.target.value)}>
                          <option value="code">A code</option>
                          <option value="qr">A QR</option>
                          <option value="text">Just text</option>
                        </select>
                      </div>
                      <div className="field" style={{ margin: 0, flex: '1 1 260px' }}>
                        <label style={{ fontSize: 11 }}>Subject</label>
                        <input placeholder="e.g. You won a free coffee!" value={g.persoSubject} onChange={(e) => updateGift(g.id, 'persoSubject', e.target.value)} />
                      </div>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>
                        Message ({'{{firstName}}'} / {'{{giftName}}'}{g.persoDelivery === 'code' ? ' / {{code}}' : ''} available)
                      </label>
                      <textarea rows={2} placeholder="Custom message shown in the email…" value={g.persoBody} onChange={(e) => updateGift(g.id, 'persoBody', e.target.value)} style={{ width: '100%', fontFamily: 'inherit' }} />
                      {g.persoDelivery === 'code' && (
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                          The code, QR and redemption instructions are always added automatically below your message — no need to insert {'{{code}}'} yourself unless you also want to mention it in your own sentence.
                        </p>
                      )}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!g.persoAutoDistribute} onChange={(e) => updateGift(g.id, 'persoAutoDistribute', e.target.checked)} />
                      <span style={{ fontSize: 12, color: '#334155' }}>
                        Mark this gift as automatically distributed
                        <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>Skips manual confirmation in Rewards — use only when there's nothing to hand over in person.</span>
                      </span>
                    </label>
                  </div>
                )}
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
