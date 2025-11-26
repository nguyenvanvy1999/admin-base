import { mock } from 'bun:test';

export type TransportOptions = Record<string, any>;

export type MockTransport = {
  sendMail: ReturnType<typeof mock> & {
    setBehavior: (behavior: 'resolve' | 'reject', value?: any) => void;
  };
};

export type MockMailer = {
  createTransport: ReturnType<typeof mock> & {
    lastCreateOptions: TransportOptions | null;
    setThrowOnCreate: (shouldThrow: boolean, err?: any) => void;
  };
  transport: MockTransport;
};

export function createMockMailer(): MockMailer {
  let throwOnCreate = false;
  let createErr = new Error('createTransport error');

  const transportBehavior: { mode: 'resolve' | 'reject'; value: any } = {
    mode: 'resolve',
    value: { messageId: 'mock-message-id' },
  };

  const sendMail = mock((_opts: Record<string, any>) => {
    if (transportBehavior.mode === 'reject') {
      throw transportBehavior.value ?? new Error('sendMail error');
    }
    return transportBehavior.value;
  }) as MockTransport['sendMail'];
  sendMail.setBehavior = (mode: 'resolve' | 'reject', value?: any) => {
    transportBehavior.mode = mode;
    if (value !== undefined) transportBehavior.value = value;
  };

  const transport: MockTransport = {
    sendMail,
  };

  const createTransport = mock((options: TransportOptions) => {
    createTransport.lastCreateOptions = options;
    if (throwOnCreate) throw createErr;
    return transport;
  }) as MockMailer['createTransport'];
  createTransport.lastCreateOptions = null;
  createTransport.setThrowOnCreate = (shouldThrow: boolean, err?: any) => {
    throwOnCreate = shouldThrow;
    if (err) createErr = err;
  };

  return {
    createTransport: createTransport,
    transport,
  };
}
