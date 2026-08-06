import { useEffect, useState } from 'react';

import { SLOW_REQUEST_MS } from '../api/client';

/*
 * True once a request has been pending long enough to be worth explaining.
 *
 * The API sleeps on Render's free tier and can take the better part of a
 * minute to wake. Without this the user sits in front of a spinner with no
 * idea whether anything is happening, and reasonably concludes it is broken.
 * Telling them what is going on costs nothing and is the difference between
 * waiting and giving up.
 *
 * Pass the same `busy` flag that drives the button's loading state.
 */
export default function useSlowRequest(busy, delay = SLOW_REQUEST_MS) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return undefined;
    }
    const id = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(id);
  }, [busy, delay]);

  return slow;
}
