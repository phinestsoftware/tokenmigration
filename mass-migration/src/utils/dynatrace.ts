/**
 * Dynatrace OpenTelemetry Integration for Azure Functions
 *
 * This module initializes OpenTelemetry tracing with Dynatrace when enabled.
 * Uses @dynatrace/opentelemetry-azure-functions for Azure Functions v4 programming model.
 *
 * Reference: https://docs.dynatrace.com/docs/ingest-from/microsoft-azure-services/azure-integrations/azure-functions/func-dynamic-plans/opentelemetry-on-azure-functions-nodejs
 */

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, Span, SpanKind } from '@opentelemetry/api';

let tracerProvider: NodeTracerProvider | null = null;
let isInitialized = false;

/**
 * Dynatrace configuration interface
 */
export interface DynatraceConfig {
  enabled: boolean;
  apiUrl?: string;
  apiToken?: string;
  serviceName: string;
  serviceVersion: string;
}

/**
 * Get Dynatrace configuration from environment
 */
export function getDynatraceConfig(): DynatraceConfig {
  return {
    enabled: process.env.DYNATRACE_ENABLED === 'true',
    apiUrl: process.env.DT_API_URL,
    apiToken: process.env.DT_API_TOKEN,
    serviceName: process.env.DT_SERVICE_NAME || 'mass-migration',
    serviceVersion: process.env.DT_SERVICE_VERSION || '1.0.0',
  };
}

/**
 * Initialize Dynatrace OpenTelemetry tracing
 * Should be called once at application startup before any other imports
 */
export async function initDynatraceTracing(): Promise<void> {
  if (isInitialized) {
    return;
  }

  const config = getDynatraceConfig();

  if (!config.enabled) {
    console.log('[Dynatrace] Tracing disabled - DYNATRACE_ENABLED is not true');
    isInitialized = true;
    return;
  }

  if (!config.apiUrl || !config.apiToken) {
    console.warn('[Dynatrace] Tracing disabled - DT_API_URL or DT_API_TOKEN not configured');
    isInitialized = true;
    return;
  }

  try {
    // Dynamic imports to avoid loading OpenTelemetry when disabled
    const { initDynatrace } = await import('@dynatrace/opentelemetry-azure-functions');

    // Initialize Dynatrace with Azure Functions hooks
    // Pass true to set up tracing and return the registered NodeTracerProvider
    tracerProvider = initDynatrace(true) as unknown as NodeTracerProvider;

    console.log('[Dynatrace] OpenTelemetry tracing initialized', {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      apiUrl: config.apiUrl.replace(/\/api\/v2\/otlp.*/, '/...'), // Mask URL for security
    });

    isInitialized = true;
  } catch (error) {
    console.error('[Dynatrace] Failed to initialize tracing', error);
    isInitialized = true; // Mark as initialized to prevent retry loops
  }
}

/**
 * Get the active tracer for creating spans
 */
export function getTracer(name?: string): ReturnType<typeof trace.getTracer> {
  const config = getDynatraceConfig();
  return trace.getTracer(name || config.serviceName, config.serviceVersion);
}

/**
 * Create a new span for tracing an operation
 */
export function createSpan(
  name: string,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
  }
): Span {
  const tracer = getTracer();
  return tracer.startSpan(name, {
    kind: options?.kind || SpanKind.INTERNAL,
    attributes: options?.attributes,
  });
}

/**
 * Execute a function within a span context
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
  }
): Promise<T> {
  const config = getDynatraceConfig();

  // If Dynatrace is disabled, just execute the function
  if (!config.enabled) {
    const noopSpan = {
      setAttribute: () => noopSpan,
      setStatus: () => noopSpan,
      recordException: () => noopSpan,
      end: () => {},
    } as unknown as Span;
    return fn(noopSpan);
  }

  const span = createSpan(name, options);

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add attributes to the current active span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const config = getDynatraceConfig();
  if (!config.enabled) return;

  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    for (const [key, value] of Object.entries(attributes)) {
      activeSpan.setAttribute(key, value);
    }
  }
}

/**
 * Record an exception on the current active span
 */
export function recordSpanException(error: Error): void {
  const config = getDynatraceConfig();
  if (!config.enabled) return;

  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.recordException(error);
    activeSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Check if Dynatrace tracing is enabled and initialized
 */
export function isDynatraceEnabled(): boolean {
  const config = getDynatraceConfig();
  return config.enabled && isInitialized;
}

/**
 * Shutdown the tracer provider gracefully
 */
export async function shutdownDynatrace(): Promise<void> {
  if (tracerProvider) {
    await tracerProvider.shutdown();
    tracerProvider = null;
    isInitialized = false;
    console.log('[Dynatrace] Tracer provider shut down');
  }
}
