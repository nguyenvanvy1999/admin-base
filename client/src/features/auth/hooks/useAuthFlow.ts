import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { REGISTER_EMAIL_KEY } from 'src/constants';
import { useAuth } from 'src/hooks/auth/useAuth';
import { parseApiError } from 'src/lib/api/errorHandler';
import { authService } from 'src/services/auth';
import type {
  AuthFlowStep,
  BackupCodeVerifyPayload,
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
} from 'src/types/auth';

export type CredentialsFormValues = LoginPayload;

interface FlowErrors {
  credentials?: string;
  setup?: string;
  mfa?: string;
  backup?: string;
}

interface SetupState {
  setupToken: string;
  mfaToken?: string;
  totpSecret?: string;
}

interface ChallengeState {
  mfaToken: string;
  loginToken?: string;
}

interface UseAuthFlowResult {
  step: AuthFlowStep;
  errors: FlowErrors;
  setupState: SetupState | null;
  challengeState: ChallengeState | null;
  accountEmail: string;
  canUseBackup: boolean;
  isSubmittingCredentials: boolean;
  isRequestingSetupSecret: boolean;
  isConfirmingSetup: boolean;
  isSubmittingMfa: boolean;
  isSubmittingBackup: boolean;
  isChallengeLocked: boolean;
  isBackupLocked: boolean;
  submitCredentials: (values: CredentialsFormValues) => void;
  requestSetupSecret: () => void;
  confirmSetupOtp: (otp: string) => void;
  submitOtp: (otp: string) => void;
  submitBackupCode: (code: string) => void;
  switchToBackup: () => void;
  switchToOtp: () => void;
}

function isTooManyAttempts(message?: string): boolean {
  if (!message) {
    return false;
  }
  return message.toLowerCase().includes('too many attempts');
}

export function useAuthFlow(): UseAuthFlowResult {
  const { completeSignIn } = useAuth();
  const [step, setStep] = useState<AuthFlowStep>('credentials');
  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(
    null,
  );
  const [accountEmail, setAccountEmail] = useState('');
  const [errors, setErrors] = useState<FlowErrors>({});
  const [isChallengeLocked, setChallengeLocked] = useState(false);
  const [isBackupLocked, setBackupLocked] = useState(false);

  const resetError = useCallback((key: keyof FlowErrors) => {
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleSession = useCallback(
    (session: LoginSuccessResponse) => {
      completeSignIn(session);
      localStorage.removeItem(REGISTER_EMAIL_KEY);
      setStep('success');
      setSetupState(null);
      setChallengeState(null);
    },
    [completeSignIn],
  );

  const handleLoginResponse = useCallback(
    (response: LoginResponse) => {
      if (response.type === 'completed') {
        handleSession(response);
        return;
      }
      if (response.type === 'mfa-confirm') {
        setChallengeState({ mfaToken: response.mfaToken });
        setStep('mfa-challenge');
        setChallengeLocked(false);
        setBackupLocked(false);
        return;
      }
      setSetupState({ setupToken: response.setupToken });
      setStep('mfa-setup');
    },
    [handleSession],
  );

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (response) => {
      handleLoginResponse(response);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, credentials: parsed.message }));
    },
  });

  const setupRequestMutation = useMutation({
    mutationFn: (setupToken: string) =>
      authService.requestMfaSetup({ setupToken }),
    onSuccess: (data) => {
      setSetupState((prev) =>
        prev
          ? { ...prev, mfaToken: data.mfaToken, totpSecret: data.totpSecret }
          : prev,
      );
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, setup: parsed.message }));
    },
  });

  const setupConfirmMutation = useMutation({
    mutationFn: (payload: { mfaToken: string; otp: string }) =>
      authService.confirmMfaSetup(payload),
    onSuccess: ({ mfaToken, loginToken }) => {
      setChallengeState({ mfaToken, loginToken });
      setSetupState(null);
      setStep('mfa-challenge');
      setErrors((prev) => ({ ...prev, setup: undefined }));
      setChallengeLocked(false);
      setBackupLocked(false);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, setup: parsed.message }));
    },
  });

  const loginMfaMutation = useMutation({
    mutationFn: (payload: { mfaToken: string; otp: string }) =>
      authService.loginWithMfa(payload),
    onSuccess: (session) => {
      handleSession(session);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, mfa: parsed.message }));
      if (isTooManyAttempts(parsed.message)) {
        setChallengeLocked(true);
      }
    },
  });

  const confirmMfaMutation = useMutation({
    mutationFn: (payload: {
      mfaToken: string;
      loginToken: string;
      otp: string;
    }) => authService.confirmMfaLogin(payload),
    onSuccess: (session) => {
      handleSession(session);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, mfa: parsed.message }));
      if (isTooManyAttempts(parsed.message)) {
        setChallengeLocked(true);
      }
    },
  });

  const backupMutation = useMutation({
    mutationFn: (payload: BackupCodeVerifyPayload) =>
      authService.verifyBackupCode(payload),
    onSuccess: (session) => {
      handleSession(session);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setErrors((prev) => ({ ...prev, backup: parsed.message }));
      if (isTooManyAttempts(parsed.message)) {
        setBackupLocked(true);
      }
    },
  });

  const submitCredentials = (values: CredentialsFormValues): void => {
    resetError('credentials');
    setChallengeState(null);
    setSetupState(null);
    setChallengeLocked(false);
    setBackupLocked(false);
    setAccountEmail(values.email);
    loginMutation.mutate(values);
  };

  const requestSetupSecret = (): void => {
    if (!setupState?.setupToken) {
      return;
    }
    resetError('setup');
    setupRequestMutation.mutate(setupState.setupToken);
  };

  const confirmSetupOtp = (otp: string): void => {
    if (!setupState?.mfaToken) {
      return;
    }
    resetError('setup');
    setupConfirmMutation.mutate({ mfaToken: setupState.mfaToken, otp });
  };

  const submitOtp = (otp: string): void => {
    if (!challengeState) {
      return;
    }
    resetError('mfa');
    setChallengeLocked(false);
    if (challengeState.loginToken) {
      confirmMfaMutation.mutate({
        mfaToken: challengeState.mfaToken,
        loginToken: challengeState.loginToken,
        otp,
      });
    } else {
      loginMfaMutation.mutate({
        mfaToken: challengeState.mfaToken,
        otp,
      });
    }
  };

  const submitBackupCode = (code: string): void => {
    if (!challengeState) {
      return;
    }
    resetError('backup');
    setBackupLocked(false);
    backupMutation.mutate({
      mfaToken: challengeState.mfaToken,
      backupCode: code,
    });
  };

  const switchToBackup = (): void => {
    if (!challengeState) {
      return;
    }
    setErrors((prev) => ({ ...prev, backup: undefined }));
    setStep('backup');
  };

  const switchToOtp = (): void => {
    if (!challengeState) {
      return;
    }
    setErrors((prev) => ({ ...prev, mfa: undefined }));
    setStep('mfa-challenge');
  };

  const canUseBackup = useMemo(() => Boolean(challengeState), [challengeState]);

  const isSubmittingMfa =
    loginMfaMutation.isPending || confirmMfaMutation.isPending;

  return {
    step,
    errors,
    setupState,
    challengeState,
    accountEmail,
    canUseBackup,
    isSubmittingCredentials: loginMutation.isPending,
    isRequestingSetupSecret: setupRequestMutation.isPending,
    isConfirmingSetup: setupConfirmMutation.isPending,
    isSubmittingMfa,
    isSubmittingBackup: backupMutation.isPending,
    isChallengeLocked,
    isBackupLocked,
    submitCredentials,
    requestSetupSecret,
    confirmSetupOtp,
    submitOtp,
    submitBackupCode,
    switchToBackup,
    switchToOtp,
  };
}
