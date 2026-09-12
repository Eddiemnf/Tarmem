import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Gate from './components/Gate';
import { StoreProvider } from './state/store';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gate>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Gate>
  </StrictMode>,
);
