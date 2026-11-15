import { useState } from 'react';
import { Grid, Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import { AppHeader } from './AppHeader.jsx';
import { SideNav } from './SideNav.jsx';
import { BRAND_COLORS } from '../../utils/constants.js';

const STYLES = {
  root: { minHeight: '100vh' },
  sider: { borderRight: `1px solid ${BRAND_COLORS.border}` },
  content: { display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 },
};

/**
 * Authenticated app shell: header, collapsible side navigation, and page content.
 * @returns {JSX.Element}
 */
export const AppLayout = () => {
  const screens = Grid.useBreakpoint();
  const isSmallScreen = !screens.lg;
  const isPhone = !screens.sm;
  // Nav is shown by default on large screens and hidden by default on small screens;
  // the toggle flips that default.
  const [isNavToggled, setIsNavToggled] = useState(false);
  const isNavHidden = isSmallScreen ? !isNavToggled : isNavToggled;

  /**
   * Toggles the side navigation.
   * @returns {void}
   */
  const handleToggleNav = () => setIsNavToggled((value) => !value);

  /**
   * Hides the navigation after navigating on small screens.
   * @returns {void}
   */
  const handleNavigate = () => {
    if (isSmallScreen) setIsNavToggled(false);
  };

  return (
    <Layout style={STYLES.root}>
      <AppHeader onToggleNav={handleToggleNav} />
      <Layout>
        <Layout.Sider
          style={STYLES.sider}
          width={248}
          collapsedWidth={0}
          collapsed={isNavHidden}
          trigger={null}
        >
          <SideNav onNavigate={handleNavigate} />
        </Layout.Sider>
        <Layout.Content style={{ ...STYLES.content, padding: isPhone ? '20px 16px' : 32 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};
