import {ApolloLink, Operation, NextLink, Observable} from 'apollo-link';
import {QUERY_NOT_FOUND_MESSAGE} from './shared';

interface Options {
  idFromOperation?(operation: Operation): string | undefined | null;
}

export function createPersistedLink(options: Options = {}) {
  return new PersistedLink(options);
}

export class PersistedLink extends ApolloLink {
  private unrecognizedIds = new Set<string>();

  constructor(private options: Options) {
    super();
  }

  request(operation: Operation, forward?: NextLink) {
    if (forward == null) {
      throw new Error('Persisted link can’t be a terminating link.');
    }

    return new Observable(observer => {
      const {idFromOperation = defaultIdFromOperation} = this.options;
      const id = idFromOperation(operation);

      if (typeof id !== 'string') {
        const subscription = forward(operation).subscribe(observer);
        return () => subscription.unsubscribe();
      }

      const wasUnrecognized = this.unrecognizedIds.has(id);

      if (!wasUnrecognized) {
        operation.extensions.persisted = {
          id,
        };

        operation.setContext({
          http: {
            includeQuery: false,
            includeExtensions: true,
          },
        });
      }

      let subscription: ReturnType<
        ReturnType<typeof forward>['subscribe']
      > | null = null;

      subscription = forward(operation).subscribe({
        next: response => {
          const errors = response ? response.errors || [] : [];

          if (errors.some(({message}) => message === QUERY_NOT_FOUND_MESSAGE)) {
            this.unrecognizedIds.add(id);

            if (subscription != null) {
              subscription.unsubscribe();
            }

            operation.setContext({
              http: {
                includeQuery: true,
                includeExtensions: false,
              },
            });

            subscription = forward(operation).subscribe(observer);
          } else {
            observer.next(response);
          }
        },
        error: observer.error.bind(observer),
        complete: observer.complete.bind(observer),
      });

      return () => {
        if (subscription != null) {
          subscription.unsubscribe();
        }
      };
    });
  }
}

function defaultIdFromOperation(operation: Operation) {
  return (operation.query as any).id || null;
}
