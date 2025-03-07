/**
 * Function check if the required environment variables are set in place.
 * List of required environment variables is set within the function.
 *
 * @throws Error if any environemnt variable is missing.
 */
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
