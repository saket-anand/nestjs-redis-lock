# Central Locking

A NestJS library for distributed locking using Redis. This package helps you manage distributed locks in a NestJS application, ensuring that only one instance of a process runs at a time.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
    - [Setup](#setup)
    - [Using the Locking Decorator](#using-the-locking-decorator)
- [API](#api)
    - [CentralLock Decorator](#centrallock-decorator)
    - [LockingService](#lockingservice)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

## Installation

To install the package, use npm or yarn:

```bash
npm install nestjs-redis-lock
```

or

```bash
yarn add nestjs-redis-lock
```

## Usage

### Setup

First, import the `LockingModule` into your NestJS application module:

```typescript
import { Module } from '@nestjs/common';
import { LockingModule } from 'central-locking-service';

@Module({
  imports: [LockingModule],
})
export class AppModule {}
```

### Using the Locking Decorator

You can use the `CentralLock` decorator to ensure a method acquires a lock before execution. This is useful for scenarios where only one instance of a method should run at a time across distributed systems.

```typescript
import { CentralLock, LockingService } from 'central-locking-service';

export class SomeService {
  constructor(private lockingService: LockingService) {}

  @CentralLock({
    lockKey: 'unique-lock-key',
    lockDuration: 10000,
    shouldReleaseAfterExecution: true,
    shouldThrowErrorIfUnableToAcquireLock: true,
  })
  async handleTask() {
    console.log('Task is being handled.');
    // Your business logic here
  }
}
```

## API

### CentralLock Decorator

The `CentralLock` decorator is used to manage distributed locks on methods.

**Options:**
- `lockKey` (string): The key to identify the lock.
- `lockDuration` (number): The duration (in milliseconds) for which the lock should be held.
- `shouldReleaseAfterExecution` (boolean): Whether to release the lock after method execution.
- `shouldThrowErrorIfUnableToAcquireLock` (boolean): Whether to throw an error if unable to acquire the lock.

### LockingService

The `LockingService` provides methods to acquire and release locks.

**Methods:**
- `acquireLock(key: string, duration: number): Promise<void>`: Acquires a lock for a specific duration.
- `releaseLock(key: string): Promise<void>`: Releases the lock for the specified key.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss any changes or improvements.

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request.

## Author

### [Saket Anand](https://saketanand.com)
**Lead Engineer**  
Saket Anand is the lead engineer behind the `nestjs-redis-lock`. With a deep focus on leveraging Redis, his work has been central to the efficient central locking provided by this library.

## License

[MIT licensed](LICENSE)
