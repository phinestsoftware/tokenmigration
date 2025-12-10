import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.SQL_SERVER = 'localhost';
process.env.SQL_DATABASE = 'TokenMigration_Test';
process.env.SQL_USER = 'sa';
process.env.SQL_PASSWORD = 'TestPassword123!';
process.env.SQL_ENCRYPT = 'false';
process.env.SQL_TRUST_SERVER_CERTIFICATE = 'true';
process.env.STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
process.env.MOCK_MASTERCARD_ENABLED = 'true';
process.env.EMAIL_ENABLED = 'false';
process.env.DEFAULT_BATCH_SIZE = '100';
process.env.FAILURE_THRESHOLD_PERCENT = '50';

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup here
});
