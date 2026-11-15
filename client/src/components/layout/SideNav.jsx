import { useMemo } from 'react';
import { Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';
import { NAV_GROUPS_BY_ROLE } from '../../routes/navConfig.js';

/**
 * Role-based side navigation built from NAV_GROUPS_BY_ROLE.
 * @param {Object} props
 * @param {() => void} [props.onNavigate] - Called after a menu item is clicked.
 * @returns {JSX.Element}
 */
export const SideNav = ({ onNavigate }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = useMemo(
    () =>
      (NAV_GROUPS_BY_ROLE[user.roleCode] || []).map((group) => ({
        type: 'group',
        key: group.label,
        label: group.label.toUpperCase(),
        children: group.items.map((item) => ({ key: item.path, label: item.label })),
      })),
    [user.roleCode],
  );

  /**
   * Navigates to the clicked menu item's path.
   * @param {{ key: string }} info - Antd menu click info.
   * @returns {void}
   */
  const handleClick = ({ key }) => {
    navigate(key);
    if (onNavigate) onNavigate();
  };

  return (
    <Menu
      mode="inline"
      items={items}
      selectedKeys={[location.pathname]}
      onClick={handleClick}
      style={{ borderInlineEnd: 0, padding: '16px 8px' }}
    />
  );
};
