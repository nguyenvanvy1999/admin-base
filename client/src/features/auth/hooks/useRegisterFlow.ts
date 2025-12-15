import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_MFA_CONFIG } from 'src/config/auth';
import { useAppMutation } from 'src/hooks/api/useMutation';
import { parseApiError } from 'src/lib/api/errorHandler';
import { authService } from 'src/services/api/auth.service';
import type { RegisterPayload, RegisterResponse } from 'src/types/auth';

export type RegisterFormValues = RegisterPayload;

type RegisterStep = 'credentials' | 'otp' | 'success';

interface RegisterErrors {
  credentials?: string;
  otp?: string;
  resend?: string;
}

interface UseRegisterFlowResult {
  step: RegisterStep;
  email: string;
  password: string;
  otpToken: string | null;
  errors: RegisterErrors;
  resendCooldown: number;
  registerLockSeconds: number;
  isResendBlocked: boolean;
  isSubmittingCredentials: boolean;
  isSubmittingOtp: boolean;
  isResendingOtp: boolean;
  canResendOtp: boolean;
  isRegisterLocked: boolean;
  submitCredentials: (values: RegisterFormValues) => void;
  submitOtp: (otp: string) => void;
  resendOtp: () => void;
  reset: () => void;
  backToCredentials: () => void;
}

const REGISTER_RATE_LIMIT_SECONDS = 45;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isRegisterRateLimited(message?: string): boolean {
  if (!message) {
    return false;
  }
  return message.toLowerCase().includes('too many registration attempts');
}

export function useRegisterFlow(): UseRegisterFlowResult {
  const [step, setStep] = useState<RegisterStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const [registerLockSeconds, setRegisterLockSeconds] = useState(0);
  const [isResendBlocked, setResendBlocked] = useState(false);

  const registerMutation = useAppMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    skipSuccessMessage: true,
    skipErrorMessage: true,
    onSuccess: (response) => {
      setErrors((prev) => ({ ...prev, credentials: undefined }));
      setRegisterLockSeconds(0);
      setResendBlocked(false);
      if (response?.otpToken) {
        setOtpToken(response.otpToken);
        setStep('otp');
        setResendCooldown(AUTH_MFA_CONFIG.resendCoolDownSeconds);
        return;
      }
      setOtpToken(null);
      setStep('success');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, credentials: parsed.message }));
      if (isRegisterRateLimited(parsed.message)) {
        setRegisterLockSeconds(REGISTER_RATE_LIMIT_SECONDS);
      }
    },
  });

  const verifyMutation = useAppMutation({
    mutationFn: (payload: { otpToken: string; otp: string }) =>
      authService.verifyAccount(payload),
    skipSuccessMessage: true,
    skipErrorMessage: true,
    onSuccess: () => {
      setErrors((prev) => ({ ...prev, otp: undefined }));
      setStep('success');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, otp: parsed.message }));
    },
  });

  const resendMutation = useAppMutation<RegisterResponse | null, Error, void>({
    mutationFn: () =>
      authService.sendRegisterOtp({ email, purpose: 'register' }),
    skipSuccessMessage: true,
    skipErrorMessage: true,
    onSuccess: (response) => {
      if (!response?.otpToken) {
        setErrors((prev) => ({ ...prev, resend: undefined }));
        setResendBlocked(true);
        return;
      }
      setErrors((prev) => ({ ...prev, resend: undefined }));
      setResendBlocked(false);
      setOtpToken(response.otpToken);
      setResendCooldown(AUTH_MFA_CONFIG.resendCoolDownSeconds);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, resend: parsed.message }));
    },
  });

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

  useEffect(() => {
    if (registerLockSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setRegisterLockSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [registerLockSeconds]);

  const submitCredentials = useCallback(
    (values: RegisterFormValues) => {
      if (registerLockSeconds > 0) {
        return;
      }
      const normalizedEmail = normalizeEmail(values.email);
      setEmail(normalizedEmail);
      setPassword(values.password);
      setErrors({});
      setOtpToken(null);
      setResendBlocked(false);
      setResendCooldown(0);
      registerMutation.mutate({
        email: normalizedEmail,
        password: values.password,
      });
    },
    [registerLockSeconds, registerMutation],
  );

  const submitOtp = useCallback(
    (otp: string) => {
      if (!otpToken) {
        return;
      }
      setErrors((prev) => ({ ...prev, otp: undefined }));
      verifyMutation.mutate({ otpToken, otp });
    },
    [otpToken, verifyMutation],
  );

  const resendOtp = useCallback(() => {
    if (!email || resendCooldown > 0 || isResendBlocked) {
      return;
    }
    setErrors((prev) => ({ ...prev, resend: undefined }));
    resendMutation.mutate();
  }, [email, isResendBlocked, resendCooldown, resendMutation]);

  const backToCredentials = useCallback(() => {
    setStep('credentials');
    setErrors((prev) => ({
      ...prev,
      otp: undefined,
      resend: undefined,
    }));
  }, []);

  const reset = useCallback(() => {
    setStep('credentials');
    setEmail('');
    setPassword('');
    setOtpToken(null);
    setErrors({});
    setResendCooldown(0);
    setRegisterLockSeconds(0);
    setResendBlocked(false);
  }, []);

  const canResendOtp = useMemo(
    () => !isResendBlocked && resendCooldown === 0,
    [isResendBlocked, resendCooldown],
  );

  return {
    step,
    email,
    password,
    otpToken,
    errors,
    resendCooldown,
    registerLockSeconds,
    isResendBlocked,
    canResendOtp,
    isRegisterLocked: registerLockSeconds > 0,
    isSubmittingCredentials: registerMutation.isPending,
    isSubmittingOtp: verifyMutation.isPending,
    isResendingOtp: resendMutation.isPending,
    submitCredentials,
    submitOtp,
    resendOtp,
    reset,
    backToCredentials,
  };
}
