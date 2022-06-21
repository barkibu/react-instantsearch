import InstantSearch from 'instantsearch.js/es/lib/InstantSearch';
import { useCallback, useMemo, version as ReactVersion } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { useInstantSearchServerContext } from '../lib/useInstantSearchServerContext';
import { useInstantSearchSSRContext } from '../lib/useInstantSearchSSRContext';
import version from '../version';

import { useForceUpdate } from './useForceUpdate';
import { useStableValue } from './useStableValue';

import type {
  InstantSearchOptions,
  SearchClient,
  UiState,
} from 'instantsearch.js';

const defaultUserAgents = [
  `react (${ReactVersion})`,
  `react-instantsearch (${version})`,
  `react-instantsearch-hooks (${version})`,
];

export type UseInstantSearchApiProps<
  TUiState extends UiState,
  TRouteState
> = InstantSearchOptions<TUiState, TRouteState>;

export function useInstantSearchApi<TUiState extends UiState, TRouteState>(
  props: UseInstantSearchApiProps<TUiState, TRouteState>
) {
  const forceUpdate = useForceUpdate();
  const serverContext = useInstantSearchServerContext<TUiState, TRouteState>();
  const serverState = useInstantSearchSSRContext();
  const initialResults = serverState?.initialResults;
  const stableProps = useStableValue(props);
  const search = useMemo(() => {
    const instance = new InstantSearch(stableProps);

    if (serverContext || initialResults) {
      // InstantSearch.js has a private Initial Results API that lets us inject
      // results on the search instance.
      // On the server, we default the initial results to an empty object so that
      // InstantSearch.js doesn't schedule a search that isn't used, leading to
      // an additional network request. (This is equivalent to monkey-patching
      // `scheduleSearch` to a noop.)
      instance._initialResults = initialResults || {};
    }

    addAlgoliaAgents(props.searchClient, [
      ...defaultUserAgents,
      serverContext && `react-instantsearch-server (${version})`,
    ]);

    return instance;
  }, [initialResults, props.searchClient, serverContext, stableProps]);

  const store = useSyncExternalStore<InstantSearch<TUiState, TRouteState>>(
    useCallback(() => {
      // On SSR, the instance is already started so we don't start it again here.
      if (!search.started) {
        search.start();
        forceUpdate();
      }

      return () => {
        search.dispose();
      };
    }, [forceUpdate, search]),
    () => search,
    () => search
  );

  if (!search.started) {
    // On the server, we start the search early to compute the search parameters.
    // On SSR, we start the search early to directly catch up with the lifecycle
    // and render.
    if (serverContext || initialResults) {
      search.start();
    }

    if (serverContext) {
      // We notify `getServerState()` of the InstantSearch internals to retrieve
      // the server state and pass it to the render on SSR.
      serverContext.notifyServer({ search });
    }
  }

  return store;
}

function addAlgoliaAgents(
  searchClient: SearchClient,
  userAgents: Array<string | null>
) {
  if (typeof searchClient.addAlgoliaAgent !== 'function') {
    return;
  }

  userAgents.filter(Boolean).forEach((userAgent) => {
    searchClient.addAlgoliaAgent!(userAgent!);
  });
}