import { Server } from 'socket.io';
import { EC2Client, StopInstancesCommand } from '@aws-sdk/client-ec2';

export class IdleMonitor {
  public lastActivityAt: Date;
  public readonly checkIntervalMs: number = 5 * 60 * 1000;
  public readonly idleThresholdMs: number = 30 * 60 * 1000;
  public intervalHandle: NodeJS.Timeout | null = null;

  private readonly instanceId: string;
  private readonly ec2Client: EC2Client;

  constructor(
    private readonly io: Server,
    instanceId: string,
    region: string,
  ) {
    this.instanceId = instanceId;
    this.lastActivityAt = new Date();
    this.ec2Client = new EC2Client({ region });
  }

  recordActivity(): void {
    this.lastActivityAt = new Date();
  }

  start(): void {
    if (this.intervalHandle !== null) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      const idleMs = Date.now() - this.lastActivityAt.getTime();
      if (idleMs > this.idleThresholdMs) {
        void this.stopSelf();
      }
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async stopSelf(): Promise<void> {
    console.log(
      `[IdleMonitor] No activity for ${this.idleThresholdMs / 60000} minutes. Stopping EC2 instance ${this.instanceId}.`,
    );

    try {
      await this.ec2Client.send(
        new StopInstancesCommand({
          InstanceIds: [this.instanceId],
        }),
      );
      console.log(`[IdleMonitor] EC2 instance ${this.instanceId} stop command sent.`);
    } catch (error) {
      console.error('[IdleMonitor] Failed to stop EC2 instance:', error);
    }
  }
}

export function createIdleMonitor(io: Server): IdleMonitor {
  const instanceId = process.env.EC2_INSTANCE_ID ?? 'i-placeholder';
  const region = process.env.AWS_REGION ?? 'us-east-2';
  return new IdleMonitor(io, instanceId, region);
}
