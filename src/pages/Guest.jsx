import { useParams } from 'react-router-dom';
import { useGuestFlow } from '../hooks/useGuestFlow';
import GuestFlowScreen from '../components/GuestFlowScreen';

export default function Guest() {
  const { token } = useParams();
  const flow = useGuestFlow({ token, persistSession: true, autoReturnMs: null });

  return (
    <GuestFlowScreen
      view={flow.view}
      form={flow.form}
      setForm={flow.setForm}
      error={flow.error}
      busy={flow.busy}
      status={flow.status}
      onSubmit={flow.handleSubmit}
      onRestart={flow.restart}
    />
  );
}
