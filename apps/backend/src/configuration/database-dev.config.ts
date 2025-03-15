import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: process.env.DATABASE_TYPE || ('postgres' as any),
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'admin',
    password: process.env.DATABASE_PASSWORD || 'adminpassword',
    database: process.env.DATABASE_NAME || 'bvv-dev',
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
  };
}

// Default export for backward compatibility
export default getTypeOrmConfig();
