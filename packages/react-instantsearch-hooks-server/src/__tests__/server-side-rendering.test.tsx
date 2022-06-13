import { render } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  InstantSearch,
  InstantSearchSSRProvider,
  Index,
} from 'react-instantsearch-hooks';
import { Hits, RefinementList, SearchBox } from 'react-instantsearch-hooks-web';

import { createSearchClient } from '../../../../test/mock';
import { getServerState } from '../getServerState';

import type {
  InstantSearchServerState,
  InstantSearchProps,
} from 'react-instantsearch-hooks';

type CreateTestEnvironmentProps = {
  searchClient: InstantSearchProps['searchClient'];
  initialUiState?: InstantSearchProps['initialUiState'];
};

function createTestEnvironment({
  searchClient,
  initialUiState = {
    instant_search: {
      query: 'iphone',
      refinementList: {
        brand: ['Apple'],
      },
    },
    instant_search_price_asc: {
      query: 'iphone',
      refinementList: {
        brand: ['Apple'],
      },
    },
  },
}: CreateTestEnvironmentProps) {
  function Search({ children }: { children?: React.ReactNode }) {
    return (
      <InstantSearch
        searchClient={searchClient}
        indexName="instant_search"
        initialUiState={initialUiState}
      >
        {children}
        <RefinementList attribute="brand" />
        <SearchBox />
        <Hits />

        <Index indexName="instant_search_price_asc">
          <Hits />

          <Index indexName="instant_search_rating_desc">
            <Hits />
          </Index>
        </Index>

        <Index indexName="instant_search_price_desc">
          <Hits />
        </Index>
      </InstantSearch>
    );
  }

  function App({
    serverState,
    children,
  }: {
    serverState?: InstantSearchServerState;
    children?: React.ReactNode;
  }) {
    return (
      <InstantSearchSSRProvider {...serverState}>
        <Search>{children}</Search>
      </InstantSearchSSRProvider>
    );
  }

  return {
    App,
  };
}

describe('Server-side rendering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders same HTML on the server and on the browser', async () => {
    // Shared code
    const searchClient = createSearchClient({});
    const { App } = createTestEnvironment({ searchClient });

    // Server code
    const serverState = await getServerState(<App />);
    const serverHtml = renderToString(<App serverState={serverState} />);

    expect(serverHtml).toMatchInlineSnapshot(
      `"<div class=\\"ais-RefinementList ais-RefinementList--noRefinement\\"><ul class=\\"ais-RefinementList-list\\"></ul></div><div class=\\"ais-SearchBox\\"><form action=\\"\\" class=\\"ais-SearchBox-form\\" novalidate=\\"\\"><input class=\\"ais-SearchBox-input\\" autoComplete=\\"off\\" autoCorrect=\\"off\\" autoCapitalize=\\"off\\" spellcheck=\\"false\\" maxLength=\\"512\\" type=\\"search\\" value=\\"iphone\\"/><button class=\\"ais-SearchBox-submit\\" type=\\"submit\\" title=\\"Submit the search query.\\"><svg class=\\"ais-SearchBox-submitIcon\\" width=\\"10\\" height=\\"10\\" viewBox=\\"0 0 40 40\\"><path d=\\"M26.804 29.01c-2.832 2.34-6.465 3.746-10.426 3.746C7.333 32.756 0 25.424 0 16.378 0 7.333 7.333 0 16.378 0c9.046 0 16.378 7.333 16.378 16.378 0 3.96-1.406 7.594-3.746 10.426l10.534 10.534c.607.607.61 1.59-.004 2.202-.61.61-1.597.61-2.202.004L26.804 29.01zm-10.426.627c7.323 0 13.26-5.936 13.26-13.26 0-7.32-5.937-13.257-13.26-13.257C9.056 3.12 3.12 9.056 3.12 16.378c0 7.323 5.936 13.26 13.258 13.26z\\"></path></svg></button><button class=\\"ais-SearchBox-reset\\" type=\\"reset\\" title=\\"Clear the search query.\\"><svg class=\\"ais-SearchBox-resetIcon\\" viewBox=\\"0 0 20 20\\" width=\\"10\\" height=\\"10\\"><path d=\\"M8.114 10L.944 2.83 0 1.885 1.886 0l.943.943L10 8.113l7.17-7.17.944-.943L20 1.886l-.943.943-7.17 7.17 7.17 7.17.943.944L18.114 20l-.943-.943-7.17-7.17-7.17 7.17-.944.943L0 18.114l.943-.943L8.113 10z\\"></path></svg></button><span class=\\"ais-SearchBox-loadingIndicator\\" hidden=\\"\\"><svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 38 38\\" stroke=\\"#444\\" class=\\"ais-SearchBox-loadingIcon\\"><g fill=\\"none\\" fill-rule=\\"evenodd\\"><g transform=\\"translate(1 1)\\" stroke-width=\\"2\\"><circle stroke-opacity=\\".5\\" cx=\\"18\\" cy=\\"18\\" r=\\"18\\"></circle><path d=\\"M36 18c0-9.94-8.06-18-18-18\\"><animateTransform attributeName=\\"transform\\" type=\\"rotate\\" from=\\"0 18 18\\" to=\\"360 18 18\\" dur=\\"1s\\" repeatCount=\\"indefinite\\"></animateTransform></path></g></g></svg></span></form></div><div class=\\"ais-Hits ais-Hits--empty\\"><ol class=\\"ais-Hits-list\\"></ol></div>"`
    );

    document.body.innerHTML = `<div id="root">${serverHtml}</div>`;

    // Browser code
    const root = document.querySelector('#root')!;
    const { container } = render(<App />, { baseElement: root, hydrate: true });

    expect(container.innerHTML).toEqual(serverHtml);
  });
});
