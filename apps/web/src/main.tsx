import {installFontRecovery} from './font-recovery';
import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';import './style.css';import './mobile-game.css';import './tile-font.css';import './game-scrollbars.css';import './table-ui/top-actions.css';import './pingfang-ui.css';import './table-ui/punctuation-controls.css';import './table-ui/sentence-layout.css';import './game-panel-theme.css';
installFontRecovery();createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
