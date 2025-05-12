import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    privateKey: readFileSync(
      join(process.cwd(), process.env.JWT_PRIVATE_KEY_PATH!),
      'utf8',
    ),

    publicKey: readFileSync(
      join(process.cwd(), process.env.JWT_PUBLIC_KEY_PATH!),
      'utf8',
    ),

    signOptions: {
      algorithm: 'RS256',
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  }),
);
