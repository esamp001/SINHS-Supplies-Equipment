import { useState } from 'react';
import { Alert, Button, Checkbox, Divider, Flex, Form, Input, Typography } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import loginHeroUrl from '../../assets/images/loginHero.svg';
import { AuthSplitLayout } from '../../components/layout/AuthSplitLayout.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { PATHS } from '../../routes/navConfig.js';
import { AUTH_ASIDE_STYLES, headingStyle } from '../../theme/sharedStyles.js';

/**
 * Navy side panel content for the login page.
 * @returns {JSX.Element}
 */
const LoginAside = () => (
  <>
    <h1 style={AUTH_ASIDE_STYLES.title}>Supplies and equipment, tracked in one place.</h1>
    <p style={AUTH_ASIDE_STYLES.lead}>
      Request supplies, borrow equipment and keep stock accurate.
    </p>
    <img style={AUTH_ASIDE_STYLES.illustration} src={loginHeroUrl} alt="" />
  </>
);

/**
 * @typedef {Object} LoginFormData
 * @property {string} username - Username.
 * @property {string} password - Password.
 * @property {boolean} rememberMe - "Keep me signed in" checkbox.
 */

/**
 * Validates the sign-in form (required fields only; credentials are checked on submit).
 * @param {LoginFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};

  if (!data.username.trim()) {
    errors.username = 'Enter your username';
  }

  if (!data.password) {
    errors.password = 'Enter your password';
  }

  return errors;
};

/**
 * Sign-in page. On success the user goes to the page they came from (or the dashboard).
 * Controlled form: values live in `formData` and update through onChange handlers.
 * @returns {JSX.Element}
 */
export const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);

  /**
   * Updates one field and clears its error.
   * @param {keyof LoginFormData} field - Field name.
   * @param {string | boolean} value - New value.
   * @returns {void}
   */
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /**
   * onChange for text and password inputs (uses the input's `name` attribute).
   * @param {import('react').ChangeEvent<HTMLInputElement>} event - Change event.
   * @returns {void}
   */
  const handleInputChange = (event) => updateField(event.target.name, event.target.value);

  /**
   * onChange for the "Keep me signed in" checkbox.
   * @param {{ target: { checked: boolean } }} event - Checkbox change event.
   * @returns {void}
   */
  const handleRememberChange = (event) => updateField('rememberMe', event.target.checked);

  /**
   * Validates, signs in through the API and redirects on success. Users who must change their
   * password (after an admin reset) go to the change-password page first.
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
      const signedInUser = await signIn(formData);

      const nextPath = signedInUser.mustChangePassword
        ? PATHS.CHANGE_PASSWORD
        : location.state?.from || PATHS.DASHBOARD;

      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
      setSubmitting(false);
    }
  };

  /**
   * Toggles the "forgot password" help note.
   * @returns {void}
   */
  const handleToggleForgot = () => setShowForgotNote((value) => !value);

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof LoginFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  return (
    <AuthSplitLayout aside={<LoginAside />}>
      <Flex vertical gap={16}>
        <Flex vertical gap={4}>
          <h2 style={headingStyle(28)}>Sign in</h2>
          <Typography.Text type="secondary" style={{ fontSize: 15 }}>
            Use the account your administrator approved.
          </Typography.Text>
        </Flex>

        {errorMessage && <Alert type="error" showIcon title={errorMessage} />}

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Username"
            htmlFor="username"
            style={{ marginBottom: 16 }}
            {...getErrorProps('username')}
          >
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              autoComplete="username"
              placeholder="Enter your username"
            />
          </Form.Item>
          <Form.Item
            label="Password"
            htmlFor="password"
            style={{ marginBottom: 12 }}
            {...getErrorProps('password')}
          >
            <Input.Password
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </Form.Item>
          <Flex wrap align="center" justify="space-between" gap={12} style={{ marginBottom: 16 }}>
            <Checkbox checked={formData.rememberMe} onChange={handleRememberChange}>
              Keep me signed in
            </Checkbox>
            <Button
              type="link"
              onClick={handleToggleForgot}
              aria-expanded={showForgotNote}
              style={{ padding: 0 }}
            >
              Forgot password?
            </Button>
          </Flex>
          {showForgotNote && (
            <Alert
              type="warning"
              title="Ask your administrator to reset your password. You'll be asked to set a new one the next time you sign in."
              style={{ marginBottom: 16 }}
            />
          )}
          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            Sign in
          </Button>
        </Form>

        <Divider style={{ margin: 0 }} />
        <Typography.Text type="secondary">
          New here? <Link to={PATHS.REGISTER}>Create an account</Link>
        </Typography.Text>
      </Flex>
    </AuthSplitLayout>
  );
};
