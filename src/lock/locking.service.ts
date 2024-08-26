import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as cronParser from 'cron-parser';
import Client from 'ioredis';
import Redlock, { ExecutionResult, Lock } from 'redlock';
import { isArray, isNumber, isUndefined } from '../utils/shared.utils';

interface LockingServiceConfigOptions {
  /**
   * The URLs of the Redis instances to use for locking. Array if using multiple Redis instances.
   */
  redisUrl: string | string[];
  /**
   * The key prefix to use for all locks.
   */
  lockKeyPrefix?: string;
  /**
   * Duration for which lock is to be acquired. It can be overridden by the lockTime in the decorator.
   * If none is provided, it will use the default duration of 1 min.
   */
  lockDuration?: number;
  /**
   * The number of times to retry acquiring a lock before giving up.
   */
  retryCount?: number;
  /**
   * The time in milliseconds to wait between retries.
   */
  retryDelay?: number;
  /**
   * The maximum amount of jitter to apply to the retry delay.
   */
  retryJitter?: number;
  /**
   * The drift factor to use for clock drift compensation.
   */
  driftFactor?: number;
  /**
   * Should release the lock after execution.
   */
  shouldReleaseAfterExecution?: boolean;
  /**
   * delta time in milliseconds to remove from the lock duration.
   */
  lockDurationDelta?: number;
}

@Injectable()
export class LockingService implements OnModuleDestroy {
  private static instance: LockingService;
  private redlock: Redlock;
  private readonly clients: Client[];
  private readonly configOptions: LockingServiceConfigOptions;

  private constructor(configOptions: LockingServiceConfigOptions) {
    this.configOptions = configOptions;
    this.clients = isArray(configOptions.redisUrl)
      ? configOptions.redisUrl.map((url: string) => new Client({ host: url }))
      : [new Client({ host: configOptions.redisUrl })];
    this.redlock = new Redlock(this.clients, {
      driftFactor: configOptions.driftFactor || 0.01,
      retryCount: configOptions.retryCount || 0,
      retryDelay: configOptions.retryDelay || 200,
      retryJitter: configOptions.retryJitter || 200,
    });
  }

  static initialize(options: LockingServiceConfigOptions) {
    if (!LockingService.instance) {
      LockingService.instance = new LockingService(options);
    }
  }

  static getInstance(): LockingService {
    if (!LockingService.instance) {
      throw new Error('LockingService has not been initialized.');
    }
    return LockingService.instance;
  }

  async acquireLock(
    key: string | string[],
    duration: number | string,
  ): Promise<Lock> {
    const lockDuration = this.getLockDuration(duration);
    const resources = isArray(key)
      ? [this.configOptions.lockKeyPrefix, ...key]
      : [this.configOptions.lockKeyPrefix, key];
    const resourcesString = resources.join(':');
    return await this.redlock.acquire([resourcesString], lockDuration);
  }

  async releaseLock(
    lock: Lock,
    shouldReleaseAfterExecution?: boolean,
  ): Promise<ExecutionResult> {
    if (this.shouldReleaseAfterExecution(shouldReleaseAfterExecution)) {
      return lock.release();
    }
  }

  public shouldReleaseAfterExecution(
    shouldReleaseAfterExecution?: boolean,
  ): boolean {
    return (
      shouldReleaseAfterExecution ||
      this.configOptions.shouldReleaseAfterExecution ||
      false
    );
  }

  public getLockDuration(duration?: number | string): number {
    const DEFAULT_DURATION = 60000; // 1 minute
    if (isUndefined(duration)) {
      if (isUndefined(this.configOptions.lockDuration)) {
        console.warn(
          'Both provided duration and default duration are undefined. Using predefined default duration.',
        );
        return DEFAULT_DURATION;
      }
      return this.configOptions.lockDuration;
    }
    if (isNumber(duration)) {
      return duration;
    }

    if (typeof duration === 'string') {
      return this.parseCronToMs(duration);
    }
    throw new Error('Invalid duration type');
  }

  async onModuleDestroy() {
    await Promise.all(this.clients.map((client) => client.quit()));
  }

  parseCronToMs(cronExpression: string): number {
    try {
      const interval = cronParser.parseExpression(cronExpression);
      const next = interval.next().getTime();
      const now = new Date().getTime();
      // const prev = interval.prev().getTime();
      return next - now;
    } catch (err) {
      throw new Error(`Invalid cron expression: ${err.message}`);
    }
  }
}
