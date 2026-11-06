// What the creation wizard cannot send in the first request: gift variants and unique codes. Right after the campaign (a draft) is created, the
// full gifts are saved with PUT /draft-slots (same endpoint as the gifts editor) and the unique codes typed in the wizard are loaded.
const persoOf = (x) => (x.redeemMethod === 'perso'
  ? { persoDelivery: x.persoDelivery, persoSubject: x.persoSubject, persoBody: x.persoBody, persoAutoDistribute: !!x.persoAutoDistribute }
  : {});

export const hasExtras = (gifts) => gifts.some((g) => g.caseIndex !== null && (g.variantsEnabled || g.persoUniqueCode));

export function fullSlots(gifts, dynamic) {
  return gifts.filter((g) => g.caseIndex !== null && (g.giftName.trim() || Number(g.stock) > 0 || g.unlimited)).map((g) => {
    const unlimited = dynamic && !!g.unlimited;
    return {
      slotIndex: g.caseIndex, giftName: g.giftName, stock: unlimited ? 0 : (Number(g.stock) || 0),
      redeemMethod: ['code', 'voucher', 'perso'].includes(g.redeemMethod) ? g.redeemMethod : 'qr',
      ...(dynamic ? { probability: Number(g.probability) || 0, unlimited } : {}),
      variantsEnabled: !!g.variantsEnabled && !unlimited,
      ...(g.variantsEnabled && !unlimited ? {
        variants: (g.variants || []).map((v) => ({
          name: v.name, stock: Number(v.stock) || 0, redeemMethod: ['code', 'voucher', 'perso'].includes(v.redeemMethod) ? v.redeemMethod : 'qr',
          ...(v.redeemMethod === 'perso' ? { ...persoOf(v), persoUniqueCode: !!v.persoUniqueCode } : {}),
        })),
      } : {}),
      ...persoOf(g),
      ...(g.redeemMethod === 'perso' && !g.variantsEnabled && !unlimited ? { persoUniqueCode: !!g.persoUniqueCode } : {}),
    };
  });
}

// Saves the full gifts, then loads the staged unique codes. Returns the list of problems (empty = all good).
export async function applyDraftExtras(api, campaignId, gifts, dynamic) {
  const problems = [];
  await api.saveDraftSlots(campaignId, fullSlots(gifts, dynamic), dynamic ? 'dynamic' : 'static');
  const staged = [];
  gifts.filter((g) => g.caseIndex !== null).forEach((g) => {
    if (g.variantsEnabled) (g.variants || []).forEach((v, vi) => { if (v.persoUniqueCode && (v.pendingCodes || '').trim()) staged.push({ slotIndex: g.caseIndex, variantIndex: vi, text: v.pendingCodes }); });
    else if (g.persoUniqueCode && (g.pendingCodes || '').trim()) staged.push({ slotIndex: g.caseIndex, variantIndex: null, text: g.pendingCodes });
  });
  if (staged.length) {
    const fresh = await api.getCampaign(campaignId);
    for (const st of staged) {
      const slot = fresh.slots.find((x) => x.slot_index === st.slotIndex);
      const variantId = st.variantIndex === null ? undefined : (slot && slot.variants[st.variantIndex] ? slot.variants[st.variantIndex].id : null);
      if (variantId === null) continue;
      try { await api.importCampaignCodes(campaignId, { slotIndex: st.slotIndex, variantId, text: st.text, mode: 'replace' }); }
      catch (e) { problems.push(`${st.slotIndex + 1}: ${e.message}`); }
    }
  }
  return problems;
}
