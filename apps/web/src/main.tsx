import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';import './style.css';import './mobile-game.css';import './tile-font.css';import './game-scrollbars.css';import './table-ui/top-actions.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
