import { useEffect, useState } from 'react';
import { Alert, Button, Col, Flex, Form, Input, Row, Select, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';

import registerHeroUrl from '../../assets/images/registerHero.svg';
import { AuthSplitLayout } from '../../components/layout/AuthSplitLayout.jsx';
import { register } from '../../api/auth.api.js';
import { listPositions } from '../../api/lookups.api.js';
import { PATHS } from '../../routes/navConfig.js';
import { AUTH_ASIDE_STYLES, headingStyle } from '../../theme/sharedStyles.js';
import { BRAND_COLORS, MIN_PASSWORD_LENGTH } from '../../utils/constants.js';

const APPROVAL_STEPS = [
  'You fill in your details and your school position.',
  'An administrator reviews it, confirms your position and assigns your role.',
  'You get an in-app notice and can sign in once approved.',
];

/** Tighter spacing between form fields so the page fits without scrolling. */
const FIELD_STYLE = { marginBottom: 12 };

const STEP_STYLES = {
  list: {
    margin: 0,
    flexShrink: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  item: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    fontSize: 15,
    lineHeight: 1.5,
    color: 'rgba(255, 255, 255, 0.88)',
  },
  number: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: '50%',
    background: BRAND_COLORS.gold,
    color: BRAND_COLORS.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
};

/**
 * Navy side panel content explaining how account approval works.
 * @returns {JSX.Element}
 */
const RegisterAside = () => (
  <>
    <h1 style={{ ...AUTH_ASIDE_STYLES.title, fontSize: 30 }}>How account approval works</h1>
    <img
      src={registerHeroUrl}
      alt=""
      style={{ ...AUTH_ASIDE_STYLES.illustration, maxWidth: 420 }}
    />
    <ol style={STEP_STYLES.list}>
      {APPROVAL_STEPS.map((step, index) => (
        <li key={step} style={STEP_STYLES.item}>
          <span style={STEP_STYLES.number}>{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  </>
);

/**
 * Confirmation shown after a registration is submitted.
 * @param {Object} props
 * @param {() => void} props.onShowForm - Shows the form again.
 * @returns {JSX.Element}
 */
const RegistrationSubmitted = ({ onShowForm }) => (
  <Flex vertical gap={20} align="flex-start">
    <Tag color="gold" variant="filled" style={{ fontWeight: 600 }}>
      Pending approval
    </Tag>
    <h2 style={headingStyle(28)}>Your account was submitted</h2>
    <Typography.Text type="secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
      An administrator will review it and assign your role. Until then, signing in will show that
      your account is pending.
    </Typography.Text>
    <Link to={PATHS.LOGIN}>
      <Button type="primary" size="large">
        Back to sign in
      </Button>
    </Link>
    <Button type="link" onClick={onShowForm} style={{ padding: 0 }}>
      Show the form again
    </Button>
  </Flex>
);

/**
 * @typedef {Object} RegisterFormData
 * @property {string} fullName - Full name.
 * @property {string} username - Chosen username.
 * @property {string} email - Email address.
 * @property {number | null} positionId - Selected position ID.
 * @property {string} password - Password.
 * @property {string} confirmPassword - Password confirmation.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates the registration form in the browser for quick feedback. The server validates again
 * and also checks that the username and email aren't already used.
 * @param {RegisterFormData} data - Form values.
 * @returns {Object<string, string>} Error message per field; empty when valid.
 */
const validateForm = (data) => {
  const errors = {};
  const username = data.username.trim();
  const email = data.email.trim();

  if (!data.fullName.trim()) {
    errors.fullName = 'Enter your full name';
  }

  if (!data.positionId) {
    errors.positionId = 'Select your position';
  }

  if (!username) {
    errors.username = 'Choose a username';
  }

  if (!email) {
    errors.email = 'Enter your email';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email';
  }

  if (!data.password) {
    errors.password = 'Enter a password';
  } else if (data.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `At least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Re-enter your password';
  } else if (data.confirmPassword !== data.password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

/**
 * Self-registration page. New accounts start as pending with no role (AGENTS.md §10).
 * Controlled form: values live in `formData` and update through onChange handlers.
 * @returns {JSX.Element}
 */
export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    positionId: null,
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [positionOptions, setPositionOptions] = useState([]);

  useEffect(() => {
    let ignore = false;

    listPositions()
      .then((positions) => {
        if (!ignore) {
          setPositionOptions(
            positions.map((position) => ({ value: position.id, label: position.name })),
          );
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  /**
   * Updates one field and clears its error.
   * @param {keyof RegisterFormData} field - Field name.
   * @param {string | number | null} value - New value.
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
   * onChange for the position dropdown.
   * @param {number} positionId - Selected position ID.
   * @returns {void}
   */
  const handlePositionChange = (positionId) => updateField('positionId', positionId);

  /**
   * Validates, sends the registration to the API and shows the "submitted" message.
   * Server field errors (e.g. username already taken) are shown under the matching fields.
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
      await register(formData);
    } catch (error) {
      setErrors(error.errors || {});
      setErrorMessage(Object.keys(error.errors || {}).length ? '' : error.message);
      setSubmitting(false);

      return;
    }

    setSubmitting(false);

    setFormData({
      fullName: '',
      username: '',
      email: '',
      positionId: null,
      password: '',
      confirmPassword: '',
    });

    setSubmitted(true);
  };

  /**
   * Shows the registration form again.
   * @returns {void}
   */
  const handleShowForm = () => setSubmitted(false);

  /**
   * Returns Form.Item props that show a field's error message.
   * @param {keyof RegisterFormData} field - Field name.
   * @returns {{ validateStatus?: 'error', help?: string }} Form.Item props.
   */
  const getErrorProps = (field) =>
    errors[field] ? { validateStatus: 'error', help: errors[field] } : {};

  if (submitted) {
    return (
      <AuthSplitLayout aside={<RegisterAside />}>
        <RegistrationSubmitted onShowForm={handleShowForm} />
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout aside={<RegisterAside />}>
      <Flex vertical gap={16}>
        <Flex vertical gap={4}>
          <h2 style={headingStyle(28)}>Create an account</h2>
          <Typography.Text type="secondary">
            For SINHS personnel. An administrator assigns your role.
          </Typography.Text>
        </Flex>

        {errorMessage && <Alert type="error" showIcon title={errorMessage} />}

        <Form layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Full name"
                htmlFor="fullName"
                style={FIELD_STYLE}
                {...getErrorProps('fullName')}
              >
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  autoComplete="name"
                  placeholder="Juan D. Cruz"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Position"
                htmlFor="positionId"
                style={FIELD_STYLE}
                {...getErrorProps('positionId')}
              >
                <Select
                  id="positionId"
                  value={formData.positionId}
                  onChange={handlePositionChange}
                  options={positionOptions}
                  showSearch={{ optionFilterProp: 'label' }}
                  placeholder="Select"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Username"
                htmlFor="username"
                style={FIELD_STYLE}
                {...getErrorProps('username')}
              >
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  autoComplete="username"
                  placeholder="Choose one"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Email"
                htmlFor="email"
                style={FIELD_STYLE}
                {...getErrorProps('email')}
              >
                <Input
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  placeholder="you@email.com"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Password"
                htmlFor="password"
                style={FIELD_STYLE}
                {...getErrorProps('password')}
              >
                <Input.Password
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  placeholder={`${MIN_PASSWORD_LENGTH}+ characters`}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Confirm password"
                htmlFor="confirmPassword"
                style={FIELD_STYLE}
                {...getErrorProps('confirmPassword')}
              >
                <Input.Password
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  placeholder="Re-enter"
                />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            Submit for approval
          </Button>
        </Form>

        <Typography.Text type="secondary">
          Already have an account? <Link to={PATHS.LOGIN}>Sign in</Link>
        </Typography.Text>
      </Flex>
    </AuthSplitLayout>
  );
};
