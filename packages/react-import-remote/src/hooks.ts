import * as React from 'react';
import {WindowWithRequestIdleCallback, DeferTiming} from '@shopify/async';
import load from './load';

interface Options {
  nonce?: string;
  defer?: DeferTiming;
}

export function useImportRemote<Imported = any>(
  source: string,
  options: Options = {},
  getImport: (window: Window) => Imported,
): {
  loading: boolean;
  loaded: boolean;
  error: Error | null;
  imported: Imported | null;
} {
  const idleCallbackHandle = React.useRef(null);
  const [loading, setLoading] = React.useState({loaded: false, loading: false});
  const [imported, setImported] = React.useState<Imported | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const {defer = DeferTiming.Mount, nonce = ''} = options;

  React.useEffect(
    () => {
      const loadRemote = () => {
        return new Promise(async resolve => {
          try {
            setLoading({loaded: false, loading: true});
            setImported(await load(source, getImport, nonce));
          } catch (err) {
            setError(err);
          } finally {
            setLoading({loaded: true, loading: false});
            resolve();
          }
        });
      };

      if (defer === DeferTiming.Idle && 'requestIdleCallback' in window) {
        if ('requestIdleCallback' in window) {
          idleCallbackHandle.current = (window as WindowWithRequestIdleCallback).requestIdleCallback(
            loadRemote,
          );
        } else {
          loadRemote();
        }
      } else if (defer === DeferTiming.Mount) {
        loadRemote();
      }

      return () => {
        if (
          idleCallbackHandle.current != null &&
          'cancelIdleCallback' in window
        ) {
          (window as WindowWithRequestIdleCallback).cancelIdleCallback(
            idleCallbackHandle.current,
          );
        }
      };
    },
    [source, nonce, getImport, defer],
  );

  return {...loading, imported, error};
}
