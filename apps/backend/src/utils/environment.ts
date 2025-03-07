export function validateDatabaseEnvironment(): void {
  const requiredEnvVars = [
    'DATABASE_TYPE',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingEnvVars.join(
        ', ',
      )}`,
    );
  }
}
