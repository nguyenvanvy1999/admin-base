import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { REGISTER_EMAIL_KEY } from 'src/constants';
import { BackupCodeStep } from 'src/features/auth/BackupCodeStep';
import { useAuthFlow } from 'src/features/auth/hooks/useAuthFlow';
import { LoginForm } from 'src/features/auth/LoginForm';
import { MfaSetupWizard } from 'src/features/auth/MfaSetupWizard';
import { MfaStep } from 'src/features/auth/MfaStep';
import { useAuth } from 'src/hooks/auth/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';

export default function LoginPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const flow = useAuthFlow();
  const location = useLocation();
  const registeredEmail =
    (location.state as { registeredEmail?: string } | null)?.registeredEmail ??
    localStorage.getItem(REGISTER_EMAIL_KEY) ??
    undefined;

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const renderCardContent = () => {
    if (flow.step === 'mfa-setup' && flow.setupState) {
      return (
        <MfaSetupWizard
          accountEmail={flow.accountEmail}
          totpSecret={flow.setupState.totpSecret}
          loadingSecret={flow.isRequestingSetupSecret}
          confirmingOtp={flow.isConfirmingSetup}
          error={flow.errors.setup}
          onRequestSecret={flow.requestSetupSecret}
          onConfirmOtp={flow.confirmSetupOtp}
        />
      );
    }

    if (flow.step === 'mfa-challenge' && flow.challengeState) {
      return (
        <MfaStep
          loading={flow.isSubmittingMfa}
          serverError={flow.errors.mfa}
          isLocked={flow.isChallengeLocked}
          canUseBackup={flow.canUseBackup}
          onSubmit={flow.submitOtp}
          onUseBackup={flow.switchToBackup}
        />
      );
    }

    if (flow.step === 'backup' && flow.challengeState) {
      return (
        <BackupCodeStep
          loading={flow.isSubmittingBackup}
          serverError={flow.errors.backup}
          isLocked={flow.isBackupLocked}
          onSubmit={flow.submitBackupCode}
          onBackToOtp={flow.switchToOtp}
        />
      );
    }

    if (flow.step === 'success') {
      return (
        <Flex vertical gap={12}>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>
            {t('auth.login.successTitle')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('auth.login.successSubtitle')}
          </Typography.Text>
        </Flex>
      );
    }

    return (
      <Flex vertical gap={12}>
        <LoginForm
          key={registeredEmail ?? 'login-form'}
          loading={flow.isSubmittingCredentials}
          serverError={flow.errors.credentials}
          initialEmail={registeredEmail}
          onSubmit={flow.submitCredentials}
        />
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {t('auth.login.needAccount')}{' '}
          <Link to="/register">{t('auth.login.gotoRegister')}</Link>
        </Typography.Paragraph>
      </Flex>
    );
  };

  return <AuthLayout>{renderCardContent()}</AuthLayout>;
}
