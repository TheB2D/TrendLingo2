import { useEffect, useState } from 'react';
import type { ZodType } from 'zod';

import type { BrowserUseEvent } from '../server/utils';
import { TaskViewWithSchema } from '../../parse';

/**
 * A hook to stream Browser Use updates to the client.
 */
export function useBrowserUse<T extends ZodType = ZodType>(route: string): TaskViewWithSchema<T> | null {
  const [status, setStatus] = useState<TaskViewWithSchema<T> | null>(null);

  useEffect(() => {
    const es = new EventSource(route);

    es.addEventListener('status', (e) => {
      if (e instanceof MessageEvent) {
        const msg = JSON.parse(e.data) as BrowserUseEvent<T>;

        setStatus(msg.data);

        if (msg.data.status === 'finished') {
          es.close();
        }
      } else {
        console.error('Event is not a MessageEvent', e);
      }
    });

    es.addEventListener('end', () => es.close());
    es.addEventListener('error', () => es.close());

    return () => es.close();
  }, [route]);

  return status;
}
