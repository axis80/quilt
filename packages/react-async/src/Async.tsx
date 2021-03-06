import * as React from 'react';
import {
  LoadProps,
  DeferTiming,
  RequestIdleCallbackHandle,
  WindowWithRequestIdleCallback,
} from '@shopify/async';
import {Omit} from '@shopify/useful-types';
import {Effect} from '@shopify/react-effect';
import {
  IntersectionObserver,
  UnsupportedBehavior,
} from '@shopify/react-intersection-observer';

import {AsyncAssetContext, AsyncAssetManager} from './context/assets';
import {normalize, resolve} from './utilities';

export interface AsyncPropsRuntime {
  defer?: DeferTiming;
  renderLoading?(): React.ReactNode;
}

interface Props<Value> extends LoadProps<Value>, AsyncPropsRuntime {
  manager?: AsyncAssetManager;
  render?(value: Value | null): React.ReactNode;
  renderLoading?(): React.ReactNode;
}

interface State<Value> {
  resolved: Value | null;
  loading: boolean;
}

/* eslint-disable @typescript-eslint/camelcase */
declare const __webpack_require__: (id: string) => any;
declare const __webpack_modules__: {[key: string]: any};
/* eslint-enable @typescript-eslint/camelcase */

class ConnectedAsync<Value> extends React.Component<
  Props<Value>,
  State<Value>
> {
  state: State<Value> = initialState(this.props);

  private mounted = true;
  private idleCallbackHandle?: RequestIdleCallbackHandle;

  componentWillUnmount() {
    this.mounted = false;

    if (this.idleCallbackHandle != null && 'cancelIdleCallback' in window) {
      (window as WindowWithRequestIdleCallback).cancelIdleCallback(
        this.idleCallbackHandle,
      );
    }
  }

  componentDidMount() {
    if (this.state.resolved != null) {
      return;
    }

    const {defer = DeferTiming.Mount} = this.props;

    if (this.props.defer === DeferTiming.Idle) {
      if ('requestIdleCallback' in window) {
        this.idleCallbackHandle = (window as WindowWithRequestIdleCallback).requestIdleCallback(
          this.load,
        );
      } else {
        this.load();
      }
    } else if (defer === DeferTiming.Mount) {
      this.load();
    }
  }

  render() {
    const {
      id,
      defer,
      manager,
      render = defaultRender,
      renderLoading = defaultRender,
    } = this.props;
    const {resolved, loading} = this.state;

    const effect =
      resolved != null && id != null && manager != null ? (
        <Effect
          kind={manager.effect}
          perform={() => manager.markAsUsed(id())}
        />
      ) : null;

    const content = loading ? renderLoading() : render(resolved);

    const intersectionObserver =
      loading && defer === DeferTiming.InViewport ? (
        <IntersectionObserver
          threshold={0}
          unsupportedBehavior={UnsupportedBehavior.TreatAsIntersecting}
          onIntersectionChange={this.loadIfIntersecting}
        />
      ) : null;

    return (
      <>
        {effect}
        {content}
        {intersectionObserver}
      </>
    );
  }

  private loadIfIntersecting = ({isIntersecting = true}) => {
    return isIntersecting ? this.load() : Promise.resolve();
  };

  private load = async () => {
    const resolved = await resolve(this.props.load);
    if (this.mounted) {
      this.setState({resolved, loading: false});
    }
  };
}

export function Async<Value>(props: Omit<Props<Value>, 'manager'>) {
  return (
    <AsyncAssetContext.Consumer>
      {manager => <ConnectedAsync manager={manager} {...props} />}
    </AsyncAssetContext.Consumer>
  );
}

function initialState<Value>(props: Props<Value>): State<Value> {
  const canResolve = props.defer == null && props.id;
  const resolved = canResolve && props.id ? tryRequire(props.id()) : null;

  return {
    resolved,
    loading: resolved == null,
  };
}

function defaultRender() {
  return null;
}

// Webpack does not like seeing an explicit require(someVariable) in code
// because that is a dynamic require that it can’t resolve. This code
// obfuscates `require()` for the purpose of fooling Webpack, which is fine
// because we only want to use the `require()` in cases where Webpack
// is not the module bundler.
//
// If we ever reference `require` directly, Webpack complains. So, we first
// check global["require"], which works in Node. However, this doesn’t work
// in Jest when the test is set to simulate a browser, as global in that case
// in a Window object. There, we can only rely on module.require, which is
// actually supposed to be something different but in Jest is the same as
// the global require function.
const requireKey = 'require';
const nodeRequire =
  (typeof global === 'object' &&
    typeof global[requireKey] === 'function' &&
    global[requireKey]) ||
  (typeof module === 'object' &&
    typeof module[requireKey] === 'function' &&
    module[requireKey]) ||
  undefined;

// If we have an ID, we try to first use Webpack’s internal stuff
// to resolve the module. If those don’t exist, we know we aren’t
// inside of a Webpack bundle, so we try to use Node’s native resolution
// (which will work in environments like Jest’s test runner).
function tryRequire(id: string) {
  if (
    /* eslint-disable @typescript-eslint/camelcase */
    typeof __webpack_require__ === 'function' &&
    typeof __webpack_modules__ === 'object' &&
    __webpack_modules__[id]
    /* eslint-enable @typescript-eslint/camelcase */
  ) {
    try {
      return normalize(__webpack_require__(id));
    } catch {
      // Just ignore failures
    }
  } else if (typeof nodeRequire === 'function') {
    try {
      return normalize(nodeRequire(id));
    } catch {
      // Just ignore failures
    }
  }

  return undefined;
}
