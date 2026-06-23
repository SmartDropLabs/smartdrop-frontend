/**
 * Comprehensive Error Handling System for SmartDrop
 * Handles Freighter, Soroban, and general application errors
 */

export enum ErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_NOT_INSTALLED = 'WALLET_NOT_INSTALLED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  MIN_LOCK_PERIOD = 'MIN_LOCK_PERIOD',
  ALREADY_LOCKED = 'ALREADY_LOCKED',
  NOT_UNLOCKABLE = 'NOT_UNLOCKABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  actionable: string;
  originalError?: any;
}

export class ErrorHandler {
  /**
   * Parse and classify different types of errors
   */
  static parseError(error: any): AppError {
    // Check if it's already an AppError
    if (error.type && error.userMessage) {
      return error as AppError;
    }

    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // Freighter Wallet Errors
    if (errorMessage.includes('Freighter') || errorMessage.includes('wallet')) {
      if (errorMessage.includes('not installed')) {
        return {
          type: ErrorType.WALLET_NOT_INSTALLED,
          message: errorMessage,
          userMessage: 'Freighter wallet is not installed. Please install it to continue.',
          retryable: false,
          actionable: 'Install Freighter wallet extension from the Chrome Web Store.',
        };
      }

      if (errorMessage.includes('rejected') || errorMessage.includes('cancelled')) {
        return {
          type: ErrorType.TRANSACTION_REJECTED,
          message: errorMessage,
          userMessage: 'Transaction was rejected or cancelled in your wallet.',
          retryable: true,
          actionable: 'Please try again and approve the transaction in your wallet.',
        };
      }

      if (errorMessage.includes('network')) {
        return {
          type: ErrorType.NETWORK_MISMATCH,
          message: errorMessage,
          userMessage: 'Your wallet is connected to a different network.',
          retryable: false,
          actionable: 'Please switch to Stellar Testnet in your Freighter wallet settings.',
        };
      }

      return {
        type: ErrorType.WALLET_NOT_CONNECTED,
        message: errorMessage,
        userMessage: 'Wallet connection error occurred.',
        retryable: true,
        actionable: 'Please reconnect your wallet and try again.',
      };
    }

    // Soroban Contract Errors
    if (errorMessage.includes('insufficient') && errorMessage.includes('balance')) {
      return {
        type: ErrorType.INSUFFICIENT_BALANCE,
        message: errorMessage,
        userMessage: 'You don\'t have enough balance for this transaction.',
        retryable: false,
        actionable: 'Please ensure you have sufficient funds and try again.',
      };
    }

    if (errorMessage.includes('minimum lock period') || errorMessage.includes('lock period not met')) {
      return {
        type: ErrorType.MIN_LOCK_PERIOD,
        message: errorMessage,
        userMessage: 'Assets are still locked. You cannot unlock them yet.',
        retryable: false,
        actionable: 'Please wait for the minimum lock period to expire before unlocking.',
      };
    }

    if (errorMessage.includes('already locked') || errorMessage.includes('position exists')) {
      return {
        type: ErrorType.ALREADY_LOCKED,
        message: errorMessage,
        userMessage: 'You already have assets locked in this pool.',
        retryable: false,
        actionable: 'Check your existing position or unlock before locking new assets.',
      };
    }

    if (errorMessage.includes('not unlockable') || errorMessage.includes('cannot unlock')) {
      return {
        type: ErrorType.NOT_UNLOCKABLE,
        message: errorMessage,
        userMessage: 'These assets cannot be unlocked at this time.',
        retryable: false,
        actionable: 'Check the lock period requirements and your position status.',
      };
    }

    // RPC and Network Errors
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      return {
        type: ErrorType.TIMEOUT,
        message: errorMessage,
        userMessage: 'The request timed out. The network might be congested.',
        retryable: true,
        actionable: 'Please wait a moment and try again.',
      };
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        type: ErrorType.RATE_LIMIT,
        message: errorMessage,
        userMessage: 'Too many requests. Please slow down.',
        retryable: true,
        actionable: 'Wait a few seconds before trying again.',
      };
    }

    if (errorMessage.includes('RPC') || errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        type: ErrorType.RPC_ERROR,
        message: errorMessage,
        userMessage: 'Network connection issue. Unable to reach Stellar network.',
        retryable: true,
        actionable: 'Check your internet connection and try again.',
      };
    }

    // Contract Simulation/Execution Errors
    if (errorMessage.includes('simulation failed') || errorMessage.includes('contract')) {
      return {
        type: ErrorType.CONTRACT_ERROR,
        message: errorMessage,
        userMessage: 'Smart contract operation failed.',
        retryable: false,
        actionable: 'Please check your transaction parameters and try again.',
      };
    }

    // Validation Errors
    if (errorMessage.includes('invalid amount') || errorMessage.includes('amount must be')) {
      return {
        type: ErrorType.INVALID_AMOUNT,
        message: errorMessage,
        userMessage: 'The amount entered is invalid.',
        retryable: false,
        actionable: 'Please enter a valid positive amount.',
      };
    }

    // Default case
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      userMessage: 'An unexpected error occurred.',
      retryable: true,
      actionable: 'Please try again. If the problem persists, contact support.',
      originalError: error,
    };
  }

  /**
   * Get appropriate toast configuration for an error
   */
  static getToastConfig(error: AppError) {
    return {
      title: this.getErrorTitle(error.type),
      description: error.userMessage,
      status: 'error' as const,
      duration: this.getErrorDuration(error.type),
      isClosable: true,
    };
  }

  /**
   * Get user-friendly error titles
   */
  private static getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.WALLET_NOT_INSTALLED:
        return 'Wallet Not Found';
      case ErrorType.WALLET_NOT_CONNECTED:
        return 'Wallet Connection Error';
      case ErrorType.TRANSACTION_REJECTED:
        return 'Transaction Rejected';
      case ErrorType.NETWORK_MISMATCH:
        return 'Network Error';
      case ErrorType.INSUFFICIENT_BALANCE:
        return 'Insufficient Balance';
      case ErrorType.CONTRACT_ERROR:
        return 'Contract Error';
      case ErrorType.RPC_ERROR:
        return 'Network Error';
      case ErrorType.RATE_LIMIT:
        return 'Too Many Requests';
      case ErrorType.TIMEOUT:
        return 'Request Timeout';
      case ErrorType.INVALID_AMOUNT:
        return 'Invalid Amount';
      case ErrorType.MIN_LOCK_PERIOD:
        return 'Assets Still Locked';
      case ErrorType.ALREADY_LOCKED:
        return 'Already Locked';
      case ErrorType.NOT_UNLOCKABLE:
        return 'Cannot Unlock';
      default:
        return 'Error';
    }
  }

  /**
   * Get appropriate toast duration based on error type
   */
  private static getErrorDuration(type: ErrorType): number {
    switch (type) {
      case ErrorType.TRANSACTION_REJECTED:
      case ErrorType.RATE_LIMIT:
        return 3000;
      case ErrorType.TIMEOUT:
      case ErrorType.INVALID_AMOUNT:
        return 5000;
      case ErrorType.WALLET_NOT_INSTALLED:
      case ErrorType.NETWORK_MISMATCH:
      case ErrorType.INSUFFICIENT_BALANCE:
        return 8000;
      default:
        return 6000;
    }
  }

  /**
   * Check if an error is retryable with exponential backoff
   */
  static shouldRetry(error: AppError, attemptCount: number): boolean {
    if (attemptCount >= 3) return false;
    return error.retryable;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static getRetryDelay(attemptCount: number): number {
    return Math.min(1000 * Math.pow(2, attemptCount), 10000);
  }

  /**
   * Log error for debugging (in development) or error reporting (in production)
   */
  static logError(error: AppError, context?: string) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.group(`🚨 ${error.type} ${context ? `(${context})` : ''}`);
      console.error('User Message:', error.userMessage);
      console.error('Technical Message:', error.message);
      console.error('Actionable:', error.actionable);
      console.error('Retryable:', error.retryable);
      if (error.originalError) {
        console.error('Original Error:', error.originalError);
      }
      console.groupEnd();
    } else {
      // In production, you might want to send to an error reporting service
      // like Sentry, LogRocket, or Bugsnag
      console.error('[ERROR]', {
        type: error.type,
        message: error.message,
        context,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Higher-order function for automatic error handling
 */
export function withErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = ErrorHandler.parseError(error);
      ErrorHandler.logError(appError, context);
      throw appError;
    }
  };
}

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const handleError = (error: any, context?: string) => {
    const appError = ErrorHandler.parseError(error);
    ErrorHandler.logError(appError, context);
    return appError;
  };

  const getToastConfig = (error: any) => {
    const appError = ErrorHandler.parseError(error);
    return ErrorHandler.getToastConfig(appError);
  };

  return {
    handleError,
    getToastConfig,
    parseError: ErrorHandler.parseError,
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  context?: string
): Promise<T> {
  let lastError: AppError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = ErrorHandler.parseError(error);
      
      if (!ErrorHandler.shouldRetry(lastError, attempt) || attempt === maxAttempts) {
        ErrorHandler.logError(lastError, `${context} (final attempt ${attempt}/${maxAttempts})`);
        throw lastError;
      }
      
      const delay = ErrorHandler.getRetryDelay(attempt);
      console.warn(`Retrying ${context} in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}