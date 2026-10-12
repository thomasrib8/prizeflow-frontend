// Shown to the sales reps (phone app) and on the Launch page when the cloud can't be reached: tells them to move to
// the offline app on the event box. The box is reached by its name (works on the venue's Wi-Fi) or, if that Wi-Fi is
// gone too, through its own network Spark-Local.
import { useTranslation } from 'react-i18next';
import { getBoxUrl } from '../utils/offlineBox';

export default function CloudLostBanner() {
  const { t } = useTranslation('admin');
  const btn = { background: '#fff', color: '#B45309', borderRadius: 8, padding: '7px 12px', fontWeight: 800, fontSize: 13.5, textDecoration: 'none', whiteSpace: 'nowrap' };
  return (
    <div role="alert" style={{ position: 'sticky', top: 0, zIndex: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: 'calc(env(safe-area-inset-top, 0px) + 9px) 12px 9px', background: '#B45309', color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
      <span>{t('cloudLost.message')}</span>
      <a href={`${getBoxUrl()}/pwa/home`} style={btn}>{t('cloudLost.open')}</a>
      <a href="http://sparkoff.box/pwa/home" style={{ ...btn, background: 'none', color: '#fff', border: '1px solid #fff', fontWeight: 600, fontSize: 12.5 }}>{t('cloudLost.viaLocal')}</a>
    </div>
  );
}
