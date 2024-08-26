import { Test, TestingModule } from '@nestjs/testing';
import { LockingService } from './locking.service';

describe('LockService', () => {
  let service: LockingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LockingService],
    }).compile();

    service = module.get<LockingService>(LockingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
