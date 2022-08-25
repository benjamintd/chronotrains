import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SWRConfig } from 'swr'
import { appWithTranslation } from 'next-i18next';
import Meta from '~/components/meta';

function MyApp({ Component, pageProps }: AppProps) {
  return <SWRConfig value={{
    fetcher: (resource: RequestInfo) => fetch(resource, {
      cache: 'force-cache',
      headers: {
        'Cache-Control': 'max-age=60'
      }
    }).then(res => res.json()),
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    compare: (a, b) => { // if we got a response once, it's a valid one.
      return a !== undefined && b !== undefined;
    }
  }}>
    <Meta />
    <Component {...pageProps} />
  </SWRConfig>
}

export default appWithTranslation(MyApp);