import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SWRConfig } from 'swr'

function MyApp({ Component, pageProps }: AppProps) {
  return <SWRConfig value={{
    fetcher: (resource, init) => fetch(resource, init).then(res => res.json())
  }}>
    <Component {...pageProps} />
  </SWRConfig>
}

export default MyApp
