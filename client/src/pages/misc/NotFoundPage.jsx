import { Button, Flex, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

import { PATHS } from '../../routes/navConfig.js';

/**
 * 404 page for unknown routes.
 * @returns {JSX.Element}
 */
export const NotFoundPage = () => {
  const navigate = useNavigate();

  /**
   * Goes to the dashboard (or login if signed out, via the route guard).
   * @returns {void}
   */
  const handleHome = () => navigate(PATHS.DASHBOARD);

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
      <Result
        status="404"
        title="Page not found"
        subTitle="The page you're looking for doesn't exist."
        extra={
          <Button type="primary" onClick={handleHome}>
            Go home
          </Button>
        }
      />
    </Flex>
  );
};
