import { useState } from 'react';
import { Grid, Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import { AppHeader } from './AppHeader.jsx';
import { SideNav } from './SideNav.jsx';
import { BRAND_COLORS } from '../../utils/constants.js';

const STYLES = {
  // Exactly one screen tall: the header and side menu stay in place.
  root: { height: '100vh', overflow: 'hidden' },
  body: { flex: 1, minHeight: 0 },
  sider: { borderRight: `1px solid ${BRAND_COLORS.border}`, overflowY: 'auto' },
  // Only the page content scrolls (vertically).
  content: { minWidth: 0, overflowY: 'auto', overflowX: 'hidden' },
  page: { display: 'flex', flexDirection: 'column', gap: 28 },
};

/**
 * Authenticated app shell: fixed header and side navigation, with a vertically scrollable
 * page content area.
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
    if (isSmallScreen) {
      setIsNavToggled(false);
    }
  };

  return (
    <Layout style={STYLES.root}>
      <AppHeader onToggleNav={handleToggleNav} />
      <Layout style={STYLES.body}>
        <Layout.Sider
          style={STYLES.sider}
          width={248}
          collapsedWidth={0}
          collapsed={isNavHidden}
          trigger={null}
        >
          <SideNav onNavigate={handleNavigate} />
        </Layout.Sider>
        <Layout.Content style={STYLES.content}>
          <div style={{ ...STYLES.page, padding: isPhone ? '20px 16px' : 32 }}>
            <Outlet />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
};
