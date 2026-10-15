// "Tutoriels et documentation": a grid with one card per tutorial. A tutorial replays the REAL application on made-up
// data (see src/tutorial/). The administrators' guides (commissioning a wheel and its box) sit below.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { Card, Button } from '../components/ui';
import { useAdmin } from '../hooks/useAdmin';
import { TUTORIAL_GROUPS, tutorialText } from '../tutorial/tutorials';
import TutorialIcon from '../tutorial/icons';
import './tutorials.css';

export default function Tutorials() {
  const { t, i18n } = useTranslation('admin');
  const { isAdmin } = useAdmin();
  const lang = (i18n.language || 'fr').slice(0, 2);
  const [guideBusy, setGuideBusy] = useState(false);
  const [error, setError] = useState('');
  const groups = TUTORIAL_GROUPS.map((g) => ({ ...g, items: g.items.filter((x) => !x.admin || isAdmin) })).filter((g) => g.items.length > 0);

  async function downloadGuide() {
    setGuideBusy(true); setError('');
    try { await api.downloadCommissioningGuide(); } catch (e) { setError(e.message); } finally { setGuideBusy(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('tutorials.pageTitle')}</h1>
          <p className="page-subtitle">{t('tutorials.pageSubtitle')}</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {groups.map((g) => (
        <section key={g.id} className="tuto-group">
          <h2 className="tuto-section">{t(`tutorials.group_${g.id}`)}</h2>
          <div className="tuto-grid">
            {g.items.map((tuto) => {
              const txt = tutorialText(tuto, lang);
              return (
                <Link key={tuto.id} to={`/tutorials/${tuto.id}`} className="tuto-card">
                  <span className="tuto-card-icon"><TutorialIcon name={tuto.icon} /></span>
                  <span className="tuto-card-title">{txt.title}</span>
                  <span className="tuto-card-sum">{txt.summary}</span>
                  <span className="tuto-card-meta">
                    <span>{t('tutorials.stepsCount', { count: tuto.steps.length })}</span>
                    {tuto.admin && <span className="tuto-chip">{t('tutorials.adminOnly')}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {isAdmin && (
        <>
          <h2 className="tuto-section">{t('tutorials.docsTitle')}</h2>
          <Card>
            <div className="tuto-doc-row">
              <div>
                <div style={{ fontWeight: 700 }}>{t('userDetail.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, maxWidth: 640, lineHeight: 1.55 }}>{t('userDetail.guideDesc')}</div>
              </div>
              <Button variant="secondary" disabled={guideBusy} onClick={downloadGuide}>{guideBusy ? t('userDetail.guideDownloading') : t('userDetail.guideBtn')}</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
