import { useEffect, useState } from 'react';
import { useWheelSocket } from './useWheelSocket';
import { posToAngle } from '../components/WheelSVG';

// The wheel drawing of the gift planner: it follows the real wheel live when it is connected, and can be turned by hand otherwise
// (same behaviour as the campaign creation page).
export function useWheelPreview() {
  const { wheelStatus, agentConnected } = useWheelSocket();
  const [previewAngle, setPreviewAngle] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);
  useEffect(() => {
    if (manualOverride || !agentConnected || !wheelStatus) return;
    setPreviewAngle(posToAngle(wheelStatus.currentPos));
  }, [agentConnected, wheelStatus, manualOverride]);
  const previewCase = Math.floor((((previewAngle % 360) + 360) % 360) / 30) + 1;
  return {
    previewAngle, previewCase, agentConnected, manualOverride,
    onRotate: (angle) => { setManualOverride(true); setPreviewAngle(angle); },
    resync: () => setManualOverride(false),
  };
}
