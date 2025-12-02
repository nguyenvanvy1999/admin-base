import { App } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { REGISTER_EMAIL_KEY } from 'src/constants';
import { useRegisterFlow } from 'src/features/auth/hooks/useRegisterFlow';
import { RegisterForm } from 'src/features/auth/RegisterForm';
import { RegisterOtpStep } from 'src/features/auth/RegisterOtpStep';
import { useAuth } from 'src/hooks/auth/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';

export default function RegisterPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const flow = useRegisterFlow();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [hasRedirected, setHasRedirected] = useState(false);

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

  return <AuthLayout>{renderCardContent()}</AuthLayout>;
}
