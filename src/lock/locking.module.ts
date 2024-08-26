import { DynamicModule, Module, Provider } from '@nestjs/common';
import { LockingService } from './locking.service';

interface LockingModuleOptions {
  /**
   * The URLs of the Redis instances to use for locking. Array if using multiple Redis instances.
   */
  redisUrl: string | string[];
  /**
   * The key prefix to use for all locks.
   */
  lockKeyPrefix?: string;
  /**
   * Should release the lock .
   */
  shouldReleaseAfterExecution?: boolean;
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
   * delta time in milliseconds to remove from the lock duration.
   */
  lockDurationDelta?: number;
}

@Module({})
export class CentralLockingModule {
  static forRoot(options: LockingModuleOptions): DynamicModule {
    LockingService.initialize(options);
    return {
      module: CentralLockingModule,
      providers: [
        {
          provide: LockingService,
          useValue: LockingService.getInstance(),
        },
      ],
      exports: [LockingService],
    };
  }

  static forRootAsync(asyncOptions: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<LockingModuleOptions> | LockingModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const asyncProviders: Provider[] = [
      {
        provide: LockingService,
        useFactory: async (...args: any[]) => {
          const options: LockingModuleOptions = await asyncOptions.useFactory(
            ...args,
          );
          LockingService.initialize(options);
          return LockingService.getInstance();
        },
        inject: asyncOptions.inject || [],
      },
    ];

    return {
      module: CentralLockingModule,
      imports: asyncOptions.imports || [],
      providers: asyncProviders,
      exports: [LockingService],
    };
  }
}
