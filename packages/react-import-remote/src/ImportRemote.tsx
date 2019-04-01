import * as React from 'react';
import {Preconnect} from '@shopify/react-html';
import {DeferTiming} from '@shopify/async';
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

  const {loading, loaded, error, imported} = useImportRemote(
    source,
    {defer, nonce},
    getImport,
  );

  React.useEffect(
    () => {
      if (error != null) {
        onError(error);
      }
    },
    [error, onError],
  );

  React.useEffect(
    () => {
      onImported(imported);
    },
    [imported, onImported],
  );


  const intersectionObserver =
    !loaded && !loading && defer === DeferTiming.InViewport ? (
      <IntersectionObserver
        threshold={0}
        unsupportedBehavior={UnsupportedBehavior.TreatAsIntersecting}
        onIntersecting={this.loadRemote}
      />
    ) : null;

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
