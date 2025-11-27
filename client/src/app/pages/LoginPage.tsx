import { Card, Col, Flex, Row, Typography } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { BackupCodeStep } from 'src/features/auth/BackupCodeStep';
import { useAuthFlow } from 'src/features/auth/hooks/useAuthFlow';
import { LoginForm } from 'src/features/auth/LoginForm';
import { MfaStep } from 'src/features/auth/MfaStep';
import { useAuth } from 'src/hooks/auth/useAuth';

export default function LoginPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const flow = useAuthFlow();

  const heroItems = useMemo(
    () => [
      t('auth.hero.items.security', 'Chuẩn bảo mật chuẩn OWASP & SOC2'),
      t('auth.hero.items.audit', 'Theo dõi phiên dang nhập real-time'),
      t('auth.hero.items.mfa', 'MFA & mã dự phòng sẵn sàng'),
    ],
    [t],
  );

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const renderCardContent = () => {
    if (flow.step === 'mfa' && flow.challenge) {
      return (
        <MfaStep
          challenge={flow.challenge}
          loading={flow.isSubmittingMfa}
          resendLoading={flow.isResendingChallenge}
          serverError={flow.errors.mfa}
          onSubmit={flow.submitOtp}
          onResend={flow.resendChallenge}
          onUseBackup={flow.switchToBackup}
        />
      );
    }

    if (flow.step === 'backup' && flow.challenge) {
      return (
        <BackupCodeStep
          challenge={flow.challenge}
          loading={flow.isSubmittingBackup}
          serverError={flow.errors.backup}
          onSubmit={flow.submitBackupCode}
          onBackToOtp={flow.switchToOtp}
        />
      );
    }

    if (flow.step === 'success') {
      return (
        <Flex vertical gap={12}>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>
            {t('auth.login.successTitle', 'Đăng nhập thành công')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('auth.login.successSubtitle', 'Đang chuyển hướng...')}
          </Typography.Text>
        </Flex>
      );
    }

    return (
      <LoginForm
        loading={flow.isSubmittingCredentials}
        serverError={flow.errors.credentials}
        onSubmit={flow.submitCredentials}
      />
    );
  };

  return (
    <div className="login-page">
      <Row className="login-page__wrapper" gutter={0}>
        <Col xs={0} md={12} className="login-page__hero">
          <Flex vertical gap={24}>
            <div>
              <Typography.Title level={2} style={{ color: 'white' }}>
                {t('auth.hero.title', 'Investment Admin Portal')}
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.85)' }}>
                {t(
                  'auth.hero.subtitle',
                  'Kiến trúc bảo mật đa lớp cho đội ngũ vận hành.',
                )}
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
              style={{ width: '100%', maxWidth: 420 }}
              bordered={false}
              bodyStyle={{ padding: 32 }}
            >
              {renderCardContent()}
            </Card>
          </Flex>
        </Col>
      </Row>
    </div>
  );
}
