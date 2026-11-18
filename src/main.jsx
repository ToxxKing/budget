import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Service worker : met l'appli en cache pour l'ouvrir sans connexion, et se met à jour tout seul.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
