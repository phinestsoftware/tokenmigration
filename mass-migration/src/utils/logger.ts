import { InvocationContext } from '@azure/functions';
import { trace } from '@opentelemetry/api';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  fileId?: string;
  batchId?: string;
  functionName?: string;
  // Dynatrace trace context for log correlation
  dt?: {
    traceId?: string;
    spanId?: string;
  };
}

export class Logger {
  private functionName: string;
  private fileId?: string;
  private batchId?: string;
  private context?: InvocationContext;

  constructor(
    functionName: string,
    options?: {
      fileId?: string;
      batchId?: string;
      context?: InvocationContext;
    }
  ) {
    this.functionName = functionName;
    this.fileId = options?.fileId;
    this.batchId = options?.batchId;
    this.context = options?.context;
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: data,
      fileId: this.fileId,
      batchId: this.batchId,
      functionName: this.functionName,
    };

    // Add Dynatrace trace context for log correlation if available
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext.traceId && spanContext.spanId) {
        entry.dt = {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      }
    }

    return entry;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry = this.formatMessage(level, message, data);
    const logString = JSON.stringify(entry);

    if (this.context) {
      switch (level) {
        case LogLevel.DEBUG:
          this.context.debug(logString);
          break;
        case LogLevel.INFO:
          this.context.info(logString);
          break;
        case LogLevel.WARN:
          this.context.warn(logString);
          break;
        case LogLevel.ERROR:
          this.context.error(logString);
          break;
      }
    } else {
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.log(logString);
          break;
        case LogLevel.WARN:
          console.warn(logString);
          break;
        case LogLevel.ERROR:
          console.error(logString);
          break;
      }
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = { ...data };

    if (error instanceof Error) {
      errorData.errorName = error.name;
      errorData.errorMessage = error.message;
      errorData.errorStack = error.stack;
    } else if (error) {
      errorData.error = String(error);
    }

    this.log(LogLevel.ERROR, message, errorData);
  }

  withFileId(fileId: string): Logger {
    return new Logger(this.functionName, {
      fileId,
      batchId: this.batchId,
      context: this.context,
    });
  }

  withBatchId(batchId: string): Logger {
    return new Logger(this.functionName, {
      fileId: this.fileId,
      batchId,
      context: this.context,
    });
  }

  child(options: { fileId?: string; batchId?: string }): Logger {
    return new Logger(this.functionName, {
      fileId: options.fileId ?? this.fileId,
      batchId: options.batchId ?? this.batchId,
      context: this.context,
    });
  }
}

export function createLogger(
  functionName: string,
  context?: InvocationContext,
  options?: { fileId?: string; batchId?: string }
): Logger {
  return new Logger(functionName, {
    ...options,
    context,
  });
}
