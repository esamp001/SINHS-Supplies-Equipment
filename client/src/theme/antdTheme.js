import { BRAND_COLORS } from '../utils/constants.js';

/**
 * Ant Design theme tokens matching the SINHS design prototype.
 * Customize appearance here instead of overriding antd CSS (AGENTS.md §11).
 * @type {import('antd').ThemeConfig}
 */
export const ANTD_THEME = {
  token: {
    colorPrimary: BRAND_COLORS.primary,
    colorLink: BRAND_COLORS.link,
    colorText: BRAND_COLORS.text,
    colorTextSecondary: BRAND_COLORS.textMuted,
    colorBorderSecondary: BRAND_COLORS.border,
    colorBgLayout: BRAND_COLORS.pageBg,
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    borderRadius: 10,
    controlHeight: 40,
    controlHeightLG: 48,
  },
  components: {
    Layout: {
      headerBg: BRAND_COLORS.navy,
      headerHeight: 68,
      headerPadding: '0 24px',
      siderBg: '#FFFFFF',
    },
    Menu: {
      itemSelectedBg: BRAND_COLORS.blueSoft,
      itemSelectedColor: BRAND_COLORS.link,
      itemHeight: 44,
      groupTitleFontSize: 12,
    },
    Card: {
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: '#F8FAFC',
    },
  },
};
