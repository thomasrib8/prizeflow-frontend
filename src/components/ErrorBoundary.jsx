import { Component } from 'react';
import { withTranslation } from 'react-i18next';
import './error-boundary.css';

// One page that fails must never blank the whole application: the menu stays, the person sees what happened in plain words and can go back
// or reload. The boundary resets by itself when `resetKey` changes (e.g. the person goes to another page from the menu).
class Boundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[ui] a page failed to render:', error, info && info.componentStack); }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { t } = this.props;
    return (
      <div className="eb" role="alert">
        <div className="eb-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
        </div>
        <h2 className="eb-title">{t('errorBoundary.title', { defaultValue: 'Cette page a rencontré un problème' })}</h2>
        <p className="eb-text">{t('errorBoundary.text', { defaultValue: "Rien n'est perdu : vos données sont intactes. Rechargez la page, ou revenez au tableau de bord." })}</p>
        <div className="eb-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{t('errorBoundary.reload', { defaultValue: 'Recharger la page' })}</button>
          <button type="button" className="btn btn-secondary" onClick={() => { window.location.assign('/'); }}>{t('errorBoundary.home', { defaultValue: 'Tableau de bord' })}</button>
        </div>
        {import.meta.env && import.meta.env.DEV && <pre className="eb-detail">{String(error && error.message)}</pre>}
      </div>
    );
  }
}

export default withTranslation('admin')(Boundary);
