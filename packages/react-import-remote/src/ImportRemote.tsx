import * as React from 'react';
import {Preconnect} from '@shopify/react-html';
import {
  RequestIdleCallbackHandle,
  DeferTiming,
  WindowWithRequestIdleCallback,
} from '@shopify/async';

import {
  IntersectionObserver,
  UnsupportedBehavior,
} from '@shopify/react-intersection-observer';
import {useImportRemote} from './hooks';

export interface Props<Imported = any> {
  source: string;
  nonce?: string;
  preconnect?: boolean;
  onError(error: Error): void;
  getImport(window: Window): Imported;
  onImported(imported: Imported): void;
  defer?: DeferTiming;
}

export function ImportRemote(props: Props) {
  const {
    source,
    preconnect,
    nonce,
    defer,
    getImport,
    onError,
    onImported,
  } = props;

  const idleCallbackHandle = React.useRef<RequestIdleCallbackHandle | null>(
    null,
  );
  const {loaded, loading, error, imported, loadRemote} = useImportRemote(
    source,
    getImport,
    {nonce},
  );

  React.useEffect(() => {
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
  });


  const intersectionObserver =
    !loaded && !loading && defer === DeferTiming.InViewport ? (
      <IntersectionObserver
        threshold={0}
        unsupportedBehavior={UnsupportedBehavior.TreatAsIntersecting}
        onIntersecting={loadRemote}
      />
    ) : null;

  React.useEffect(
    () => {
      if (error != null) {
        onError(error);
      }

      onImported(imported);
    },
    [error, imported],
  );

  if (preconnect) {
    const url = new URL(source);
    return (
      <>
        <Preconnect source={url.origin} />
        {intersectionObserver}
      </>
    );
  }

  return intersectionObserver;
}
