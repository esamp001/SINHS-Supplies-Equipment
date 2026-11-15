import { App as AntdApp, ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from './context/AuthProvider.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';
import { ANTD_THEME } from './theme/antdTheme.js';

/**
 * Root component: Ant Design theme, antd App context (message/modal), router and auth.
 * @returns {JSX.Element}
 */
export const App = () => (
  <ConfigProvider theme={ANTD_THEME}>
    <AntdApp>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </AntdApp>
  </ConfigProvider>
);
