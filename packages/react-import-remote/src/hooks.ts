import * as React from 'react';
import {useIntersection} from '@shopify/react-intersection-observer';
import {
  DeferTiming,
  WindowWithRequestIdleCallback,
  RequestIdleCallbackHandle,
} from '@shopify/async';
import load from './load';

interface Options<Imported> {
  nonce?: string;
  defer?: DeferTiming;
  onError?(error: Error): void;
  getImport(window: Window): Imported;
  onImported?(imported: Imported): void;
}

type State = 'loading' | 'error' | 'loaded' | null;

export function useImportRemote<Imported = any>(
  source: string,
  options: Options<Imported>,
): {
  state: State;
  imported: Imported | null;
  intersectionRef: any;
} {
  const [intersection, intersectionRef] = useIntersection();
  const [state, setState] = React.useState<State>(null);
  const [imported, setImported] = React.useState<Imported | null>(null);
  const idleCallbackHandle = React.useRef<RequestIdleCallbackHandle | null>(
    null,
  );
  const {
    defer = DeferTiming.Mount,
    nonce = '',
    getImport,
    onError = () => {},
    onImported = () => {},
  } = options;

  const loadRemote = React.useCallback(
    () => {
      return new Promise(async resolve => {
        try {
          setState('loading');
          const importResult = await load(source, getImport, nonce);
          setImported(importResult);
          onImported(importResult);
        } catch (error) {
          setState('error');
          onError(error);
        } finally {
          setState('loaded');
          resolve();
        }
      });
    },
    [getImport, nonce, onError, onImported, source],
  );

  React.useEffect(
    () => {
      if (
        state !== 'loaded' &&
        state !== 'loading' &&
        defer === DeferTiming.InViewport &&
        intersection.isIntersecting
      ) {
        loadRemote();
      }

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
    [defer, loadRemote, state, intersection, nonce, getImport, source],
  );

  return {state, imported, intersectionRef};
}
