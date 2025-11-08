import { useTranslation } from 'react-i18next';

export const createRequiredValidator = (
  t: (key: string) => string,
  key: string,
) => {
  return (value: unknown) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return t(key);
    }
    return undefined;
  };
};

export const createMinLengthValidator = (
  t: (key: string) => string,
  key: string,
  minLength: number,
) => {
  return (value: unknown) => {
    if (typeof value === 'string' && value.length < minLength) {
      return t(key);
    }
    return undefined;
  };
};

export const createPasswordMatchValidator = (
  t: (key: string) => string,
  key: string,
  password: string,
) => {
  return (value: unknown) => {
    if (typeof value === 'string' && value !== password) {
      return t(key);
    }
    return undefined;
  };
};

export const useValidation = () => {
  const { t } = useTranslation();

  return {
    required: (key: string) => createRequiredValidator(t, key),
    minLength: (key: string, minLength: number) =>
      createMinLengthValidator(t, key, minLength),
    passwordMatch: (key: string, password: string) =>
      createPasswordMatchValidator(t, key, password),
  };
};
