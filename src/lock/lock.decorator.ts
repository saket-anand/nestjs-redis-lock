import 'reflect-metadata';
import { LockingService } from './locking.service';
import { Lock } from 'redlock';
import { isString, isUndefined } from '../utils/shared.utils';

export const LOCK_KEY = 'LOCK_KEY';

export interface LockMetadata {
  /**
   * Unique key for the lock, It will be prefixed with the lockKeyPrefix set in module to acquire lock.
   */
  lockKey: string;
  /**
   * Cron expression to determine the lock's time-to-live. It will lock the method execution based on the cron expression.
   * If number it should be in milliseconds.
   */
  lockDuration?: number | string;
  /**
   * If this Flag is set to true, An Error will be thrown if the lock is not acquired
   */
  shouldThrowErrorIfUnableToAcquireLock?: boolean;
  /**
   * Should release the lock after execution. Otherwise, it will be released after the lockTime.
   * By default, it is set to false.
   */
  shouldReleaseAfterExecution?: boolean;
  /**
   * if the lock is acquired based on the argument passed to the method use argument.
   * The argument should be a string or number. and that will be appended to the lockKey.
   */
  lockKeyType?: 'static' | 'argument';
  /**
   * if the lock is acquired based on the argument passed to the method use argument.
   * The argument should be a string or number. and that will be appended to the lockKey.
   */
  lockKeyArgumentIndex?: number;
}

export function CentralLock(metadata: LockMetadata) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(LOCK_KEY, metadata, target, propertyKey);

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const lockingService = LockingService.getInstance();
      if (!lockingService) {
        console.error('LockingService instance is required but not provided.');
        throw new Error('LockingService instance is required.');
      }
      let lock: Lock;
      try {
        const lockKey = [metadata.lockKey];
        if (metadata.lockKeyType === 'argument') {
          const valueFromArgs = args[metadata.lockKeyArgumentIndex];
          if (!isUndefined(valueFromArgs)) {
            lockKey.push(
              isString(valueFromArgs)
                ? valueFromArgs
                : valueFromArgs.toString(),
            );
          }
        }
        lock = await lockingService.acquireLock(lockKey, metadata.lockDuration);
      } catch (err) {
        if (metadata.shouldThrowErrorIfUnableToAcquireLock) {
          console.error('Throwing error as shouldThrowError is True.');
          throw new Error('Unable to acquire lock');
        } else {
          console.warn('Unable to acquire lock, skipping execution.');
          return;
        }
      }
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        throw err;
      } finally {
        await lockingService.releaseLock(
          lock,
          metadata.shouldReleaseAfterExecution,
        );
      }
    };
    return descriptor;
  };
}
