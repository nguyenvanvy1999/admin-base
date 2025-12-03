import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'src/global.css';
import 'antd/dist/reset.css';
import './i18n';
import { AppProvider } from './app/AppProvider';

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <AppProvider />
  </StrictMode>,
);
