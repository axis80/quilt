import * as React from 'react';
import load from './load';

interface Options {
  nonce?: string;
}

export function useImportRemote<Imported = any>(
  source: string,
  getImport: (window: Window) => Imported,
  options: Options = {},
): {
  loading: boolean;
  loaded: boolean;
  error: Error | null;
  imported: Imported | null;
  loadRemote(): void;
} {
  const [loading, setLoading] = React.useState({loaded: false, loading: false});
  const [imported, setImported] = React.useState<Imported | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const {nonce = ''} = options;

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

  React.useEffect(
    () => {
      if (loadRemote == null) {
        return;
      }

      loadRemote();
    },

    [source, nonce, getImport],
  );

  return {...loading, imported, error, loadRemote};
}
