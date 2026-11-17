import { useState } from 'react';
import { Card, Tabs, Typography } from 'antd';

import { PageHero } from '../../components/common/PageHero.jsx';
import { MasterDataTab } from './MasterDataTab.jsx';

/** One tab per master data list. */
const MASTER_DATA_TABS = [
  {
    resource: 'categories',
    tabLabel: 'Categories',
    label: 'Category',
    usedByLabel: 'Items',
    extraField: { key: 'description', label: 'Description', maxLength: 255 },
  },
  {
    resource: 'units',
    tabLabel: 'Units',
    label: 'Unit',
    usedByLabel: 'Items',
    extraField: { key: 'abbreviation', label: 'Abbreviation', maxLength: 20 },
  },
  {
    resource: 'locations',
    tabLabel: 'Locations',
    label: 'Location',
    usedByLabel: 'Items',
    extraField: { key: 'description', label: 'Description', maxLength: 255 },
  },
  {
    resource: 'positions',
    tabLabel: 'Positions',
    label: 'Position',
    usedByLabel: 'Users',
    extraField: null,
  },
];

/**
 * Master data page (Admin only): categories, units, locations and school positions in tabs.
 * Item types have their own page.
 * @returns {JSX.Element}
 */
export const MasterDataPage = () => {
  const [activeTab, setActiveTab] = useState(MASTER_DATA_TABS[0].resource);

  const tabItems = MASTER_DATA_TABS.map((tab) => ({
    key: tab.resource,
    label: tab.tabLabel,
    children: (
      <MasterDataTab
        resource={tab.resource}
        label={tab.label}
        usedByLabel={tab.usedByLabel}
        extraField={tab.extraField}
      />
    ),
  }));

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Administration / Master data
          </Typography.Text>
        }
        title="Master data"
        description="Lists used across the system: item categories, units of measure, storage locations and school positions."
      />
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} destroyOnHidden />
      </Card>
    </>
  );
};
