import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Col, Flex, Row, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

import { getDashboardSummary } from '../../api/dashboard.api.js';
import { ListPanel } from '../../components/common/ListPanel.jsx';
import { PageHero } from '../../components/common/PageHero.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLE_LABELS } from '../../utils/constants.js';
import { getFirstName } from '../../utils/textFormat.js';
import { DASHBOARD_BY_ROLE } from './dashboardConfig.js';

/**
 * Role-based home page: greeting with quick actions, summary stats and two list panels.
 * Numbers and lists are loaded from GET /dashboard/summary for the signed-in user's role.
 * @returns {JSX.Element}
 */
export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = DASHBOARD_BY_ROLE[user.roleCode];
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the dashboard numbers and lists for this role. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadSummary = async () => {
      try {
        const data = await getDashboardSummary();

        if (!ignore) {
          setSummary(data);
          setErrorMessage('');
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  /**
   * Loads the dashboard again (used by the Retry button).
   * @returns {void}
   */
  const handleRetry = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  return (
    <>
      <PageHero
        eyebrow={
          <Tag color="gold" variant="filled" style={{ alignSelf: 'flex-start', fontWeight: 700 }}>
            {ROLE_LABELS[user.roleCode].toUpperCase()}
          </Tag>
        }
        title={`Good day, ${getFirstName(user.fullName)}`}
        description={config.description}
        illustrationUrl={config.illustrationUrl}
      >
        <Flex wrap gap={12}>
          {config.actions.map((action, index) => (
            <Button
              key={action.label}
              type={index === 0 ? 'primary' : 'default'}
              size="large"
              onClick={() => navigate(action.path)}
            >
              {action.label}
            </Button>
          ))}
        </Flex>
      </PageHero>

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load the dashboard."
          description={errorMessage}
          action={<Button onClick={handleRetry}>Retry</Button>}
        />
      )}

      <Row gutter={[16, 16]}>
        {config.stats.map((stat) => (
          <Col key={stat.key} xs={24} sm={12} xl={6}>
            <StatCard
              label={stat.label}
              note={stat.note}
              value={summary?.stats[stat.key]}
              loading={loading}
            />
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        {config.panels.map((panel) => (
          <Col key={panel.key} xs={24} xl={12}>
            <ListPanel
              title={panel.title}
              viewAllPath={panel.path}
              rows={(summary?.panels[panel.key] || []).map(panel.toRow)}
              loading={loading}
            />
          </Col>
        ))}
      </Row>
    </>
  );
};
