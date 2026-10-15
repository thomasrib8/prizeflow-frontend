// Which representation suits a data source — by plain rules (instant, free, works on the offline box):
//   time -> line · département / région -> map · number -> histogram · a few categories -> donut · many categories -> bars.
// A donut is not suggested on a tiny sample (a pie of 6 answers says nothing) nor on multiple-choice answers (the shares overlap).
export const GEO_TYPES = new Set(['fr_department', 'fr_region']);

// The representations that make sense for a source (the first one is the default)
export function allowedViz(dim) {
  if (!dim) return ['bar', 'donut'];
  if (dim.key === 'day') return ['line'];
  if (GEO_TYPES.has(dim.fieldType)) return ['map', 'bar'];
  if (dim.type === 'number') return ['column', 'bar'];
  return ['donut', 'bar'];
}

// -> { viz, reason: i18n key under dashboard.*, n } or null while the data is not there yet
export function recommendViz(dim, res) {
  if (!dim) return null;
  if (dim.key === 'day') return { viz: 'line', reason: 'recoTime' };
  if (GEO_TYPES.has(dim.fieldType)) return { viz: 'map', reason: 'recoGeo' };
  if (dim.type === 'number') return { viz: 'column', reason: 'recoNumber' };
  if (!res) return null;
  const n = (res.buckets || []).filter((b) => b.label !== '…').length;
  if (res.answered < 8) return { viz: 'bar', reason: 'recoSmall' };
  if (dim.fieldType === 'multi_choice') return { viz: 'bar', reason: 'recoMulti' };
  if (n >= 2 && n <= 5) return { viz: 'donut', reason: 'recoFew', n };
  return { viz: 'bar', reason: 'recoMany', n };
}
