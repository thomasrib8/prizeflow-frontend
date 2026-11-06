import { useTranslation } from 'react-i18next';
import { Card } from './ui';
import './dynamic-distribution.css';

// Choice of the distribution method, made when the campaign is created (locked when it is activated).
export default function DistributionModePicker({ value, onChange, disabled = false }) {
  const { t } = useTranslation('admin');
  return (
    <Card title={t('dynamic.modeTitle')} className="mt-card">
      <div className="dyn-modes" role="radiogroup" aria-label={t('dynamic.modeTitle')}>
        {['static', 'dynamic'].map((m) => (
          <button key={m} type="button" role="radio" aria-checked={value === m} disabled={disabled} className={`dyn-mode${value === m ? ' on' : ''}`} onClick={() => onChange(m)}>
            <b>{t(m === 'static' ? 'dynamic.modeStatic' : 'dynamic.modeDynamic')}</b>
            <span>{t(m === 'static' ? 'dynamic.modeStaticDesc' : 'dynamic.modeDynamicDesc')}</span>
          </button>
        ))}
      </div>
      <p className="dyn-lock">{t('dynamic.modeLocked')}</p>
    </Card>
  );
}
