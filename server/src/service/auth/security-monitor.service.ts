import crypto from 'node:crypto';
import { db, type IDb } from 'src/config/db';
import { SecurityEventType } from 'src/generated';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  type SettingService,
  settingService,
} from 'src/service/misc/setting.service';
import {
  ACTIVITY_TYPE,
  IdUtil,
  LOG_LEVEL,
  type LoginMethod,
  type PrismaTx,
  type SecurityDeviceInsight,
} from 'src/share';

export type SecurityCheckResult = SecurityDeviceInsight & {
  action: 'allow' | 'block';
  reason?: 'unknown_device';
};

type EvaluateParams = {
  userId: string;
  clientIp: string;
  userAgent: string;
  method: LoginMethod;
};

export class SecurityMonitorService {
  constructor(
    private readonly deps: {
      db: IDb;
      auditLogService: AuditLogService;
      settingService: SettingService;
    } = { db, auditLogService, settingService },
  ) {}

  async evaluateLogin(params: EvaluateParams): Promise<SecurityCheckResult> {
    const { userId, clientIp, userAgent, method } = params;
    const securitySettings = await this.deps.settingService.loginSecurity();

    if (!securitySettings.deviceRecognition) {
      return { action: 'allow', deviceFingerprint: null, isNewDevice: false };
    }

    const deviceFingerprint = this.generateFingerprint(userAgent, clientIp);
    const knownDevice = await this.deps.db.session.findFirst({
      where: { createdById: userId, deviceFingerprint },
      select: { id: true },
    });

    const isNewDevice = !knownDevice;

    if (isNewDevice && securitySettings.auditWarning) {
      await this.recordUnknownDeviceWarning({
        clientIp,
        userAgent,
        userId,
        deviceFingerprint,
        method,
      });
    }

    if (isNewDevice && securitySettings.blockUnknownDevice) {
      return {
        action: 'block',
        reason: 'unknown_device',
        deviceFingerprint,
        isNewDevice: true,
      };
    }

    return {
      action: 'allow',
      deviceFingerprint,
      isNewDevice,
    };
  }

  private generateFingerprint(userAgent: string, clientIp: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userAgent}::${clientIp}`)
      .digest('hex');
  }

  private async recordUnknownDeviceWarning(params: {
    userId: string;
    clientIp: string;
    userAgent: string;
    deviceFingerprint: string;
    method: LoginMethod;
  }): Promise<void> {
    const { userId, clientIp, userAgent, deviceFingerprint, method } = params;

    await this.deps.db.$transaction(async (tx: PrismaTx) => {
      await tx.securityEvent.create({
        data: {
          id: IdUtil.dbId(),
          userId,
          eventType: SecurityEventType.suspicious_activity,
          ip: clientIp,
          metadata: {
            userAgent,
            deviceFingerprint,
            reason: 'unknown_device',
          },
        },
        select: { id: true },
      });

      await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.LOGIN,
        payload: { method, error: 'unknown_device' },
        userId,
        ip: clientIp,
        userAgent,
        level: LOG_LEVEL.WARNING,
      });
    });
  }
}

export const securityMonitorService = new SecurityMonitorService();
