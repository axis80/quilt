import * as React from 'react';
import {Preconnect} from '@shopify/react-html';
import {DeferTiming} from '@shopify/async';

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

export default function ImportRemote({
  source,
  nonce,
  preconnect,
  onError,
  getImport,
  onImported,
  defer,
}: Props) {
  const {intersectionRef} = useImportRemote(source, {
    onError,
    onImported,
    defer,
    nonce,
    getImport,
  });

  const intersectionObserver =
    defer === DeferTiming.InViewport && intersectionRef ? (
      <div ref={intersectionRef} />
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
