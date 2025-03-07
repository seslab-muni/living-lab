import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: process.env.DATABASE_TYPE as any,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
  };
}

// Default export for backward compatibility
export default getTypeOrmConfig();
