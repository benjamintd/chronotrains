import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SWRConfig } from 'swr'
import { appWithTranslation } from 'next-i18next';
import Meta from '~/components/meta';

function MyApp({ Component, pageProps }: AppProps) {
  return <SWRConfig value={{
    fetcher: (resource: RequestInfo, init: RequestInit) => fetch(resource, init).then(res => res.json()),
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  }}>
    <Meta />
    <Component {...pageProps} />
  </SWRConfig>
}

export default appWithTranslation(MyApp);