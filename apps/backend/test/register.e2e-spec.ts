import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ValidationPipe } from '@nestjs/common';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.enableCors();
    await app.init();
  });

  it('/register (POST) 400 missing required data', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ firstName: 'John' })
      .expect(400)
  });
  
//   it('/users (POST) should return 201 for valid data', () => {
//     return request(app.getHttpServer())
//       .post('/users')
//       .send({ name: 'John Doe', email: 'john@example.com' })
//       .expect(201);
//   });
  
});

