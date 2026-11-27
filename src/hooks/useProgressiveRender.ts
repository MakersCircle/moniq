import { startTransition, useEffect, useState } from 'react';

/** Let the first batch paint before scheduling more content at low priority. */
export function useProgressiveRender(total: number, batchSize: number) {
  const [limit, setLimit] = useState(batchSize);

  useEffect(() => {
    if (limit >= total) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        startTransition(() => setLimit(Math.min(limit + batchSize, total)));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [batchSize, limit, total]);

  return Math.min(limit, total);
}
