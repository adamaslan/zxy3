// Jest setup file for test environment configuration
// Add custom matchers, mock globals, or environment setup here

// Suppress console errors during tests (can be enabled with --verbose)
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn()
  };
}

// Setup test database or mock data if needed
beforeAll(async () => {
  // Placeholder for global test setup
});

afterAll(async () => {
  // Placeholder for global test cleanup
});
