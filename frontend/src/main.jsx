import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './components/components.css';
import './theme.css';
import './catalog.css';
import './team.css';
import './responsive.css';

createRoot(document.getElementById('root')).render(<App />);
