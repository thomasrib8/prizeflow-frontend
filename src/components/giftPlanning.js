export const CASE_COUNT = 12;

// A gift can only be placed on the wheel once it has a name and a stock —
// the wheel's tooltip and the created campaign both need them.
// Dynamic distribution: an "unlimited" gift needs no stock.
export function isGiftReady(g, dynamic = false) {
  return !!g.giftName.trim() && (Number(g.stock) > 0 || (dynamic && !!g.unlimited));
}
