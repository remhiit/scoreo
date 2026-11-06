import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@scoreboards/design-system/styles.css'
import './catalog.css'
import { Catalog } from './shell/Catalog'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Catalog />
  </StrictMode>,
)
