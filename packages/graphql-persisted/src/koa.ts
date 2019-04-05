import {Context} from 'koa';
import compose from 'koa-compose';
import bodyparser from 'koa-bodyparser';
import {State} from '@shopify/sewing-kit-koa';

import {QUERY_NOT_FOUND_MESSAGE} from './shared';

interface Options {
  getOperation?(
    id: string,
  ): string | null | undefined | Promise<string | null | undefined>;
}

interface PersistedBody {
  query?: string;
  operationName: string;
  variables: {[key: string]: any};
  extensions: {
    persisted: {id: string};
  };
}

function createOperationAssociationMiddleware({getOperation}: Options) {
  return async function persistedOperationAssociationMiddleware(
    ctx: Context,
    next: Function,
  ) {
    const {body} = (ctx.request as unknown) as {body: unknown};

    if (
      typeof body !== 'object' ||
      body == null ||
      'query' in (body as {}) ||
      !isPersistedBody(body as {})
    ) {
      await next();
      return;
    }

    const finalGetOperation =
      getOperation ||
      ((id: string) => {
        const {assets} = ctx.state as State;

        if (assets == null || assets.graphQLSource == null) {
          throw new Error(
            'You must either provide a `getOperation()` option or use a version of `@shopify/sewing-kit-koa` that supports resolving GraphQL identifiers.',
          );
        }

        return assets.graphQLSource(id);
      });

    const operation = await finalGetOperation(
      (body as PersistedBody).extensions.persisted.id,
    );

    if (typeof operation === 'string') {
      (body as PersistedBody).query = operation;
      await next();
    } else {
      ctx.type = 'json';
      ctx.body = {errors: [{message: QUERY_NOT_FOUND_MESSAGE}]};
    }
  };
}

export function createPersistedGraphQLMiddleware(options: Options) {
  return compose([bodyparser(), createOperationAssociationMiddleware(options)]);
}

function isPersistedBody(body: {
  [key: string]: unknown;
}): body is PersistedBody {
  const extensions = body.extensions;

  if (typeof extensions !== 'object' || extensions == null) {
    return false;
  }

  const {persisted} = extensions as NonNullable<PersistedBody['extensions']>;

  if (typeof persisted !== 'object' || persisted == null) {
    return false;
  }

  return typeof persisted.id === 'string';
}
