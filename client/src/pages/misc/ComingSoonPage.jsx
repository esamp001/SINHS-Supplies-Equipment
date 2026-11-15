import { Button, Card, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

import { PATHS } from '../../routes/navConfig.js';

/**
 * Placeholder for modules that are not built yet in the prototype.
 * @param {Object} props
 * @param {string} props.title - Module name.
 * @returns {JSX.Element}
 */
export const ComingSoonPage = ({ title }) => {
  const navigate = useNavigate();

  /**
   * Goes back to the dashboard.
   * @returns {void}
   */
  const handleBack = () => navigate(PATHS.DASHBOARD);

  return (
    <Card>
      <Result
        status="info"
        title={title}
        subTitle="This module isn't part of the prototype yet."
        extra={
          <Button type="primary" onClick={handleBack}>
            Back to dashboard
          </Button>
        }
      />
    </Card>
  );
};
