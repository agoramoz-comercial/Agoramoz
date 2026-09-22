'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/track';
import type { AnalyticsEvent } from '@/lib/analytics/events';

/** Dispara um evento de visualização uma única vez, à montagem. */
export function ViewTracker({ event }: { event: AnalyticsEvent }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(event);
  }, [event]);
  return null;
}
