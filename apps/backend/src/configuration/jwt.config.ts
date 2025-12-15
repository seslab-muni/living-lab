import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { readFileSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'node:fs';

export default registerAs('jwt', (): JwtModuleOptions => {
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  const privateKeyFullPath = privateKeyPath
    ? join(process.cwd(), privateKeyPath)
    : undefined;
  const publicKeyFullPath = publicKeyPath
    ? join(process.cwd(), publicKeyPath)
    : undefined;

  const hasPrivate = privateKeyFullPath && existsSync(privateKeyFullPath);
  const hasPublic = publicKeyFullPath && existsSync(publicKeyFullPath);

  if (!hasPrivate || !hasPublic) {
    console.warn(
      'JWT key files or environment variables are missing. Using mock keys for development mode.',
    );
    const mockKey = 'mock-dev-jwt-secret';

    return {
      secret: mockKey,
      signOptions: {
        algorithm: 'HS256',
        expiresIn,
      },
    };
  }

  return {
    privateKey: readFileSync(privateKeyFullPath, 'utf8'),
    publicKey: readFileSync(publicKeyFullPath, 'utf8'),
    signOptions: {
      algorithm: 'RS256',
      expiresIn,
    },
  };
});
