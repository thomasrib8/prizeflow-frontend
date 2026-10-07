import { useParams } from 'react-router-dom';
import { useGuestFlow } from '../hooks/useGuestFlow';
import GuestFlowScreen from '../components/GuestFlowScreen';

// The staff tablet's "Spin the wheel" screen as its own public page
// (/kiosk/:token) — the same flow as the Launch page's kiosk overlay
// (pages/LaunchCampaign.jsx): form, queue, spin, reveal, then back to a blank
// form for the next walk-up guest. No login and no sidebar, so the offline
// "event box" can serve it to a tablet on the local Wi-Fi with nothing else
// of the app in the way. Never persists a session: one shared device cycles
// through many different guests.
export default function Kiosk() {
  const { token } = useParams();
  const flow = useGuestFlow({ token, persistSession: false, autoReturnMs: 7000, source: 'kiosk' });

  return (
    <GuestFlowScreen
      view={flow.view}
      campaignInfo={flow.campaignInfo}
      form={flow.form}
      setForm={flow.setForm}
      error={flow.error}
      busy={flow.busy}
      status={flow.status}
      onSubmit={flow.handleSubmit}
      onRestart={flow.restart}
      onOpenReview={flow.openReviewLink}
      reviewPending={flow.reviewPending}
      onDismissReview={flow.dismissReview}
    />
  );
}
