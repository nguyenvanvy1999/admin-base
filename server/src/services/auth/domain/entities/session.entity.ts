export class Session {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly expired: Date,
    public readonly ip: string,
    public readonly userAgent: string,
    public readonly device: string | null,
    public readonly deviceFingerprint: string | null,
    public readonly sessionType: string | null,
    public readonly created: Date,
    public revoked: boolean,
    public lastActivityAt: Date | null,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expired;
  }
}
