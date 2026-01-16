/**
 * Application entry point - initializes services before Azure Functions start
 *
 * This file is loaded first and initializes:
 * - Dynatrace OpenTelemetry tracing (if enabled)
 *
 * IMPORTANT: This must be imported before any other modules to ensure
 * tracing is set up before any HTTP/database clients are created.
 */

import { initDynatraceTracing } from './utils/dynatrace.js';

// Initialize Dynatrace tracing synchronously at module load time
// This ensures tracing is ready before any function handlers execute
(async () => {
  try {
    await initDynatraceTracing();
  } catch (error) {
    console.error('[Startup] Failed to initialize Dynatrace tracing:', error);
    // Don't throw - allow application to continue without tracing
  }
})();

// Re-export for explicit initialization if needed
export { initDynatraceTracing };
