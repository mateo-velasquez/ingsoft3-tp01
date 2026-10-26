import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'

// Sentry: errors, page loads and usage of the front.
// The DSN of a front is not a secret: it only allows SENDING data, and it travels in the
// JavaScript the browser downloads anyway.
Sentry.init({
  dsn: 'https://b8873d78d84ab507c70282db97a38386@o4512323588521984.ingest.us.sentry.io/4512323815866368',
  environment: window.location.hostname,     // which site it came from: QA, PROD or localhost
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,                     // measure every page load
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
