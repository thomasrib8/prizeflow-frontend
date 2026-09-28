export const CASE_COUNT = 12;

// A gift can only be placed on the wheel once it has a name and a stock —
// the wheel's tooltip and the created campaign both need them.
export function isGiftReady(g) {
  return !!g.giftName.trim() && Number(g.stock) > 0;
}
