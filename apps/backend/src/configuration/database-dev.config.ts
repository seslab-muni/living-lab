import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default {
  type: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  username: 'admin',
  password: 'adminpassword',
  database: 'bvv-dev',
  autoLoadEntities: true,
  synchronize: true,
} as TypeOrmModuleOptions;
