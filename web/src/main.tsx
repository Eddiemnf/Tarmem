import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Gate from './components/Gate';
import { LogicProvider } from './state/viewModel';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gate>
      <LogicProvider>
        <App />
      </LogicProvider>
    </Gate>
  </StrictMode>,
);
