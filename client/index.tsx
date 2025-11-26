import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@client/global.css';
import 'antd/dist/reset.css';
import '@ant-design/pro-components/dist/assets/style.css';
import './i18n';
import { AppProvider } from './app/AppProvider';

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <AppProvider />
  </StrictMode>,
);
