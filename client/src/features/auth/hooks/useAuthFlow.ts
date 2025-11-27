import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { AUTH_STORAGE_KEYS } from 'src/config/auth';
import { useAuth } from 'src/hooks/auth/useAuth';
import { parseApiError } from 'src/lib/api/errorHandler';
import { authService } from 'src/services/auth';
import type {
  AuthFlowStep,
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
  MfaChallenge,
  VerifyBackupPayload,
  VerifyMfaPayload,
} from 'src/types/auth';

export type CredentialsFormValues = Omit<LoginPayload, 'deviceId'>;

interface FlowErrors {
  credentials?: string;
  mfa?: string;
  backup?: string;
}

interface UseAuthFlowResult {
  step: AuthFlowStep;
  challenge: MfaChallenge | null;
  errors: FlowErrors;
  isSubmittingCredentials: boolean;
  isSubmittingMfa: boolean;
  isSubmittingBackup: boolean;
  isResendingChallenge: boolean;
  submitCredentials: (values: CredentialsFormValues) => void;
  submitOtp: (code: string, rememberDevice?: boolean) => void;
  submitBackupCode: (code: string) => void;
  resendChallenge: () => void;
  switchToBackup: () => void;
  switchToOtp: () => void;
}

function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = localStorage.getItem(AUTH_STORAGE_KEYS.deviceId);
  if (existing) {
    return existing;
  }

  const fallback = Math.random().toString(36).slice(2);
  const newId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : fallback;
  localStorage.setItem(AUTH_STORAGE_KEYS.deviceId, newId);
  return newId;
}

function isSuccessResponse(
  response: LoginResponse | LoginSuccessResponse,
): response is LoginSuccessResponse {
  return response.status === 'authenticated';
}

export function useAuthFlow(): UseAuthFlowResult {
  const { completeSignIn } = useAuth();
  const [step, setStep] = useState<AuthFlowStep>('credentials');
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [errors, setErrors] = useState<FlowErrors>({});

  const deviceId = useMemo(() => getDeviceId(), []);

  const resetError = useCallback((key: keyof FlowErrors) => {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleSession = useCallback(
    (session: LoginSuccessResponse) => {
      completeSignIn(session);
      setStep('success');
    },
    [completeSignIn],
  );

  const handleChallengeResponse = useCallback((response: LoginResponse) => {
    if (response.status === 'mfa_required') {
      setChallenge(response.challenge);
      setStep('mfa');
      return;
    }
    if (response.status === 'backup_required') {
      setChallenge(response.challenge);
      setStep('backup');
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (response) => {
      if (isSuccessResponse(response)) {
        handleSession(response);
      } else {
        handleChallengeResponse(response);
      }
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, credentials: parsed.message }));
    },
  });

  const verifyMfaMutation = useMutation({
    mutationFn: (payload: VerifyMfaPayload) => authService.verifyMfa(payload),
    onSuccess: (session) => {
      handleSession(session);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, mfa: parsed.message }));
    },
  });

  const backupMutation = useMutation({
    mutationFn: (payload: VerifyBackupPayload) =>
      authService.verifyBackup(payload),
    onSuccess: (session) => {
      handleSession(session);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, backup: parsed.message }));
    },
  });

  const resendMutation = useMutation({
    mutationFn: (challengeId: string) => authService.resendMfa(challengeId),
    onSuccess: (nextChallenge) => {
      setChallenge(nextChallenge);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, mfa: parsed.message }));
    },
  });

  const submitCredentials = (values: CredentialsFormValues): void => {
    resetError('credentials');
    loginMutation.mutate({
      ...values,
      deviceId: deviceId || undefined,
    });
  };

  const submitOtp = (code: string, rememberDevice?: boolean): void => {
    if (!challenge) {
      return;
    }
    resetError('mfa');
    verifyMfaMutation.mutate({
      challengeId: challenge.challengeId,
      code,
      rememberDevice,
      deviceId: deviceId || undefined,
    });
  };

  const submitBackupCode = (code: string): void => {
    if (!challenge) {
      return;
    }
    resetError('backup');
    backupMutation.mutate({
      challengeId: challenge.challengeId,
      backupCode: code,
      deviceId: deviceId || undefined,
    });
  };

  const resendChallenge = (): void => {
    if (!challenge) {
      return;
    }
    resendMutation.mutate(challenge.challengeId);
  };

  const switchToBackup = (): void => {
    if (challenge?.allowBackupCode) {
      setErrors((prev) => ({ ...prev, backup: undefined }));
      setStep('backup');
    }
  };

  const switchToOtp = (): void => {
    if (challenge && challenge.method !== 'backup') {
      setErrors((prev) => ({ ...prev, mfa: undefined }));
      setStep('mfa');
    }
  };

  return {
    step,
    challenge,
    errors,
    isSubmittingCredentials: loginMutation.isPending,
    isSubmittingMfa: verifyMfaMutation.isPending,
    isSubmittingBackup: backupMutation.isPending,
    isResendingChallenge: resendMutation.isPending,
    submitCredentials,
    submitOtp,
    submitBackupCode,
    resendChallenge,
    switchToBackup,
    switchToOtp,
  };
}
