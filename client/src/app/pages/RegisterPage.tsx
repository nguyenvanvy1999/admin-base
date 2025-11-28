import { App, Card, Col, Flex, Row, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from 'src/components/LanguageSwitcher';
import { REGISTER_EMAIL_KEY } from 'src/constants';
import { useRegisterFlow } from 'src/features/auth/hooks/useRegisterFlow';
import { RegisterForm } from 'src/features/auth/RegisterForm';
import { RegisterOtpStep } from 'src/features/auth/RegisterOtpStep';
import { useAuth } from 'src/hooks/auth/useAuth';

export default function RegisterPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const flow = useRegisterFlow();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [hasRedirected, setHasRedirected] = useState(false);

  const heroItems = useMemo(
    () => [
      t('auth.hero.items.security'),
      t('auth.hero.items.audit'),
      t('auth.hero.items.mfa'),
    ],
    [t],
  );

  useEffect(() => {
    if (flow.step !== 'success' || hasRedirected) {
      return;
    }
    setHasRedirected(true);
    if (flow.email) {
      localStorage.setItem(REGISTER_EMAIL_KEY, flow.email);
    }
    message.success(t('auth.register.successToast'));
    navigate('/login', {
      replace: true,
      state: { registeredEmail: flow.email },
    });
  }, [flow.step, flow.email, hasRedirected, message, navigate, t]);

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const renderCardContent = () => {
    if (flow.step === 'otp' && flow.otpToken) {
      return (
        <RegisterOtpStep
          email={flow.email}
          serverError={flow.errors.otp}
          resendError={flow.errors.resend}
          loading={flow.isSubmittingOtp}
          resendLoading={flow.isResendingOtp}
          resendCooldown={flow.resendCooldown}
          isResendBlocked={flow.isResendBlocked}
          canResend={flow.canResendOtp}
          onSubmit={flow.submitOtp}
          onResend={flow.resendOtp}
          onBack={flow.backToCredentials}
        />
      );
    }

    return (
      <RegisterForm
        loading={flow.isSubmittingCredentials}
        disabled={flow.isRegisterLocked}
        serverError={flow.errors.credentials}
        lockSeconds={flow.registerLockSeconds}
        initialEmail={flow.email}
        onSubmit={flow.submitCredentials}
      />
    );
  };

  return (
    <div className="login-page">
      <Flex justify="flex-end" style={{ padding: '16px 24px 0' }}>
        <LanguageSwitcher size="small" />
      </Flex>
      <Row className="login-page__wrapper" gutter={0}>
        <Col xs={0} md={12} className="login-page__hero">
          <Flex vertical gap={24}>
            <div>
              <Typography.Title level={2} style={{ color: 'white' }}>
                {t('auth.hero.title')}
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.85)' }}>
                {t('auth.hero.subtitle')}
              </Typography.Paragraph>
            </div>
            <Flex vertical gap={12}>
              {heroItems.map((item) => (
                <Typography.Text
                  key={item}
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  • {item}
                </Typography.Text>
              ))}
            </Flex>
          </Flex>
        </Col>
        <Col xs={24} md={12} className="login-page__form">
          <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
            <Card
              style={{ width: '100%', maxWidth: 420, overflow: 'hidden' }}
              bordered={false}
              bodyStyle={{ padding: 32, overflow: 'hidden' }}
            >
              {renderCardContent()}
            </Card>
          </Flex>
        </Col>
      </Row>
    </div>
  );
}
