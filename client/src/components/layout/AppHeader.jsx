import { Badge, Button, Flex, Grid, Layout, Tooltip } from 'antd';
import { BellOutlined, MenuOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { BrandMark } from '../common/BrandMark.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { PATHS } from '../../routes/navConfig.js';
import { ROLE_LABELS, ROLES } from '../../utils/constants.js';

/** Static unread notification counts per role (prototype). */
const UNREAD_BY_ROLE = {
  [ROLES.ADMIN]: 3,
  [ROLES.CUSTODIAN]: 5,
  [ROLES.STAFF]: 2,
};

const STYLES = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    color: '#FFFFFF',
  },
  button: {
    color: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    background: 'transparent',
  },
  user: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.3 },
  userName: { fontSize: 14 },
  userMeta: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' },
};

/**
 * Top bar: brand, notification bell with unread count, user name/position/role, log out.
 * @param {Object} props
 * @param {() => void} props.onToggleNav - Toggles the side navigation (small screens).
 * @returns {JSX.Element}
 */
export const AppHeader = ({ onToggleNav }) => {
  const { user, signOut } = useAuth();
  const unreadCount = UNREAD_BY_ROLE[user.roleCode] || 0;
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isWide = Boolean(screens.md);

  /**
   * Signs out and returns to the login page.
   * @returns {void}
   */
  const handleLogout = () => {
    signOut();
    navigate(PATHS.LOGIN, { replace: true });
  };

  return (
    <Layout.Header style={STYLES.header}>
      <Flex align="center" gap={12}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          aria-label="Toggle navigation"
          onClick={onToggleNav}
          style={{ color: '#FFFFFF' }}
        />
        <BrandMark size="small" tagline={isWide ? 'Supplies & Equipment' : ''} />
      </Flex>
      <Flex align="center" gap={isWide ? 16 : 8}>
        <Tooltip title="Notifications">
          <Badge count={unreadCount} size="small" color="#E8B71A" style={{ color: '#0F172A' }}>
            <Button
              icon={<BellOutlined />}
              aria-label={`Notifications, ${unreadCount} unread`}
              style={STYLES.button}
            />
          </Badge>
        </Tooltip>
        {isWide && (
          <div style={STYLES.user}>
            <strong style={STYLES.userName}>{user.fullName}</strong>
            <span style={STYLES.userMeta}>
              {user.positionName} · {ROLE_LABELS[user.roleCode]}
            </span>
          </div>
        )}
        <Button onClick={handleLogout} style={STYLES.button}>
          Log out
        </Button>
      </Flex>
    </Layout.Header>
  );
};
