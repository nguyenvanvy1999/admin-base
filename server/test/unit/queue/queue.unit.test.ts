import { describe, expect, it } from 'bun:test';
import { MAX_JOB_KEEP_COUNT, MAX_JOB_KEEP_SECONDS } from 'src/share';

describe('src/config/queue.ts', () => {
  it('should create all queues with correct options when module is imported', async () => {
    const mod = await import('src/config/queue');
    expect(mod.teleQueue).toBeDefined();
    expect(mod.emailQueue).toBeDefined();
    expect(mod.p2pQueue).toBeDefined();
    expect(mod.auditLogQueue).toBeDefined();
    expect(mod.batchLogQueue).toBeDefined();

    expect(mod.teleQueue.name).toBe('Telegram');
    expect(mod.emailQueue.name).toBe('Email');
    expect(mod.p2pQueue.name).toBe('P2P');
    expect(mod.auditLogQueue.name).toBe('AuditLog');
    expect(mod.batchLogQueue.name).toBe('BatchAuditLog');

    const jobOptions = {
      age: MAX_JOB_KEEP_SECONDS,
      count: MAX_JOB_KEEP_COUNT,
    };

    expect(
      mod.teleQueue?.opts?.defaultJobOptions?.removeOnComplete,
    ).toMatchObject(jobOptions);
    expect(mod.teleQueue?.opts?.defaultJobOptions?.removeOnFail).toBeDefined();

    expect(mod.emailQueue?.opts?.connection).toBeDefined();
    expect(
      mod.emailQueue?.opts?.defaultJobOptions?.removeOnComplete,
    ).toMatchObject(jobOptions);

    expect(mod.p2pQueue?.opts?.connection).toBeDefined();
    expect(
      mod.p2pQueue?.opts?.defaultJobOptions?.removeOnComplete,
    ).toMatchObject(jobOptions);
  });

  it('should set custom defaultJobOptions for auditLogQueue', async () => {
    const mod = await import('src/config/queue');

    const opts = mod.auditLogQueue?.opts?.defaultJobOptions;
    expect(opts).toBeDefined();
    expect(opts?.removeOnComplete).toMatchObject({
      age: MAX_JOB_KEEP_SECONDS,
      count: 1000,
    });
    expect(opts?.removeOnFail).toMatchObject({
      age: MAX_JOB_KEEP_SECONDS * 2,
      count: 5000,
    });
    expect(opts?.attempts).toBe(3);
    expect(opts?.backoff).toMatchObject({ type: 'exponential', delay: 2000 });
  });

  it('should reuse shared default options for batchLogQueue', async () => {
    const mod = await import('src/config/queue');
    const opts = mod.batchLogQueue?.opts?.defaultJobOptions;
    expect(opts).toBeDefined();
    expect(opts?.removeOnComplete).toMatchObject({
      age: MAX_JOB_KEEP_SECONDS,
      count: MAX_JOB_KEEP_COUNT,
    });
    expect(opts?.removeOnFail).toMatchObject({
      age: MAX_JOB_KEEP_SECONDS,
      count: MAX_JOB_KEEP_COUNT,
    });
  });
});
