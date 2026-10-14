// The wheel has been away from the cloud for a while during an active campaign, in an account that has an event box.
// That is what really happens when the venue's internet drops: the reps' phones (4G) still reach the cloud, so the
// "cloud lost" banner never shows, but the wheel is gone and the box is taking over. The delay filters out a Pi
// restarting or a Wi-Fi blink; it is a little longer than the wheel's own switch to the box (20-35 s).
import { useEffect, useState } from 'react';

export function useWheelLost({ agentConnected, hasCampaign, boxSeen, delayMs = 45000 }) {
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (!(hasCampaign && boxSeen && !agentConnected)) { setLost(false); return undefined; }
    const id = setTimeout(() => setLost(true), delayMs);
    return () => clearTimeout(id);
  }, [agentConnected, hasCampaign, boxSeen, delayMs]);
  return lost;
}
