import { useState } from 'react';
import { Alert, App, Button, Flex, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import loginHeroUrl from '../../assets/images/loginHero.svg';
import { changePassword } from '../../api/auth.api.js';
import { AuthSplitLayout } from '../../components/layout/AuthSplitLayout.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { PATHS } from '../../routes/navConfig.js';
import { AUTH_ASIDE_STYLES, headingStyle } from '../../theme/sharedStyles.js';
import { MIN_PASSWORD_LENGTH } from '../../utils/constants.js';

/**
 * @typedef {Object} ChangePasswordFormData
 * @property {string} currentPassword - Current (or temporary) password.
 * @property {string} newPassword - New password.
 * @property {string} confirmPassword - New password again.
 */

/**
 * Navy side panel content for the change-password page.
 * @returns {JSX.Element}
 */
const ChangePasswordAside = () => (
  <>
    <h1 style={AUTH_ASIDE_STYLES.title}>Set a new password</h1>
    <p style={AUTH_ASIDE_STYLES.lead}>
      Your password was reset by an administrator. Choose a new one to continue.
    </p>
    <img style={AUTH_ASIDE_STYLES.illustration} src={loginHeroUrl} alt="" />
  </>
);

/**
 * Validates the change-password form in the browser. The server validates again.
 * @param {ChangePasswordFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};

  if (!data.currentPassword) {
    errors.currentPassword = 'Enter your current or temporary password';
  }

  if (!data.newPassword) {
    errors.newPassword = 'Enter a new password';
  } else if (data.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `At least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Re-enter your new password';
  } else if (data.confirmPassword !== data.newPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

/**
 * Change-password page. Users with `mustChangePassword` are sent here after signing in with a
 * temporary password and can't open other pages until they finish (AGENTS.md §10).
 * @returns {JSX.Element}
 */
export const ChangePasswordPage = () => {
  const { message } = App.useApp();
  const { signOut, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Updates one field and clears its error.
   * @param {keyof ChangePasswordFormData} field - Field name.
   * @param {string} value - New value.
   * @returns {void}
   */
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /**
   * onChange for the password inputs (uses the input's `name` attribute).
   * @param {import('react').ChangeEvent<HTMLInputElement>} event - Change event.
   * @returns {void}
   */
  const handleInputChange = (event) => updateField(event.target.name, event.target.value);

  /**
   * Validates, saves the new password and goes to the dashboard.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setErrorMessage('');
    const validationErrors = validateForm(formData);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      const updatedUser = await changePassword(formData);

      updateUser(updatedUser);
      message.success('Your password was changed.');
      navigate(PATHS.DASHBOARD, { replace: true });
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
      setSubmitting(false);
    }
  };

  /**
   * Signs out instead of changing the password.
   * @returns {Promise<void>}
   */
  const handleSignOut = async () => {
    await signOut();
    navigate(PATHS.LOGIN, { replace: true });
  };

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof ChangePasswordFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <AuthSplitLayout aside={<ChangePasswordAside />}>
      <Flex vertical gap={16}>
        <Flex vertical gap={4}>
          <h2 style={headingStyle(28)}>Change password</h2>
          <Typography.Text type="secondary">
            Use the temporary password from your administrator as the current password.
          </Typography.Text>
        </Flex>

        {errorMessage && <Alert type="error" showIcon title={errorMessage} />}

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Current password"
            htmlFor="currentPassword"
            style={{ marginBottom: 14 }}
            {...getErrorProps('currentPassword')}
          >
            <Input.Password
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item
            label="New password"
            htmlFor="newPassword"
            style={{ marginBottom: 14 }}
            {...getErrorProps('newPassword')}
          >
            <Input.Password
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              autoComplete="new-password"
              placeholder={`${MIN_PASSWORD_LENGTH}+ characters`}
            />
          </Form.Item>
          <Form.Item
            label="Confirm new password"
            htmlFor="confirmPassword"
            style={{ marginBottom: 18 }}
            {...getErrorProps('confirmPassword')}
          >
            <Input.Password
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              autoComplete="new-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            Save new password
          </Button>
        </Form>

        <Button type="link" onClick={handleSignOut} style={{ padding: 0, alignSelf: 'flex-start' }}>
          Sign out instead
        </Button>
      </Flex>
    </AuthSplitLayout>
  );
};
