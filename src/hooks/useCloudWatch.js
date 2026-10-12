// Is the cloud still reachable from this device? A cheap request every 4 s; two network failures in a row (the fetch
// itself failed, not an HTTP error) means the connection is lost — same rule as the kiosk's red band. Off on the
// event box itself (there the cloud is not expected).
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function useCloudWatch(enabled = true) {
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (!enabled) { setLost(false); return undefined; }
    let failures = 0;
    let cancelled = false;
    async function beat() {
      try { await api.pingCloud(); failures = 0; } catch (err) { if (err instanceof TypeError) failures += 1; }
      if (!cancelled) setLost(failures >= 2);
    }
    const id = setInterval(beat, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [enabled]);
  return lost;
}
