import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('AppModule placeholder test', () => {
  it('does nothing', () => {
    // intentionally blank
  });
});

describe('Application Build (Unit Test) with Mocked DB Connection', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override the DataSource provider to prevent an actual DB connection
      .overrideProvider(DataSource)
      .useValue({
        initialize: jest.fn().mockResolvedValue(true),
        destroy: jest.fn().mockResolvedValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it.skip('should compile and run the application', () => {
    expect(app).toBeDefined();
  });
});
