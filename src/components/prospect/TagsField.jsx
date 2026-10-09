// Tags: compact chips to read, one input to edit (comma-separated, as stored today).
import { useTranslation } from 'react-i18next';

export default function TagsField({ c }) {
  const { t } = useTranslation('admin');
  const list = (c.tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  return (
    <div className="pc-tags">
      <div className="pc-cell-label">{t('common.tagLabel')}</div>
      {c.editing ? (
        <input className="pc-input" placeholder={t('prospectCard.tagPlaceholder')} value={c.tags} onChange={(e) => c.setTags(e.target.value)} />
      ) : list.length ? (
        <div className="pc-chips">{list.map((x) => <span key={x} className="pc-chip">{x}</span>)}</div>
      ) : (
        <div className="pc-cell-value empty">—</div>
      )}
    </div>
  );
}
