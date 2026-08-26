import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnlockModal from './UnlockModal';
import { useFarmStore } from '@/store/farmStore';
import { useStellarWallet } from '@/context/StellarWalletContext';
import { useUnlockAssetsFeePreview } from '@/hooks/useSorobanQuery';
import { unlockAssets } from '@/lib/soroban';
import { useCountdown } from '@/hooks/useCountdown';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { createElement, type ReactNode } from 'react';

// Mock dependencies
vi.mock('@/store/farmStore', () => ({
  useFarmStore: vi.fn(),
}));

vi.mock('@/context/StellarWalletContext', () => ({
  useStellarWallet: vi.fn(),
}));

vi.mock('@/hooks/useSorobanQuery', () => ({
  useUnlockAssetsFeePreview: vi.fn(),
  QUERY_KEYS: {
    USER_POSITION: 'userPosition',
    USER_CREDITS: 'userCredits',
    POOLS: 'pools',
    PLATFORM_STATS: 'platformStats',
  }
}));

vi.mock('@/lib/soroban', () => ({
  unlockAssets: vi.fn(),
  computePartialUnlockPreview: vi.fn((lockedAmount: number, unlockAmount: number, dailyRate: number) => ({
    remainingStake: Math.max(0, lockedAmount - unlockAmount),
    newDailyRate: lockedAmount > 0 ? (Math.max(0, lockedAmount - unlockAmount) / lockedAmount) * dailyRate : 0,
  })),
  getContractErrorMessage: vi.fn(() => undefined),
  stellarExpertTxUrl: vi.fn((hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`),
}));

vi.mock('@/hooks/useCountdown', () => ({
  useCountdown: vi.fn(),
}));

vi.mock('@/context/ErrorContext', () => ({
  useErrorHandler: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    handleError: vi.fn((err: unknown) => ({
      userMessage: err instanceof Error ? err.message : String(err),
      code: 'ERR',
      message: err instanceof Error ? err.message : String(err),
    })),
  })),
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithProviders(ui: ReactNode) {
  const queryClient = createQueryClient();
  return render(
    createElement(ChakraProvider, null,
      createElement(QueryClientProvider, { client: queryClient }, ui)
    )
  );
}

const mockPosition = {
  id: 'pool-1',
  contractAddress: 'test-contract-id',
  symbol: 'XLM',
  name: 'XLM Pool',
  lockedAmount: 100,
  lockedAt: Date.now() - 100000,
  lockPeriodSeconds: 60,
  dailyRate: '0.1',
  minDepositAmount: 1,
  img: '',
  earned: '10',
  stake: '100',
  totalStakedLiquidity: '$1000',
};

describe('UnlockModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useFarmStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) => {
      const state = {
        activeModal: 'unlock',
        selectedPosition: mockPosition,
        close: vi.fn(),
      };
      return selector(state);
    });

    vi.mocked(useStellarWallet).mockReturnValue({
      publicKey: 'G_TEST_USER',
      walletApi: { signTransaction: vi.fn() } as never,
      isNetworkMismatch: false,
      isConnected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as ReturnType<typeof useStellarWallet>);

    vi.mocked(useUnlockAssetsFeePreview).mockReturnValue({
      data: { feePreview: '100' },
      isFetching: false,
    } as ReturnType<typeof useUnlockAssetsFeePreview>);

    vi.mocked(useCountdown).mockReturnValue({
      isElapsed: true,
      remainingMs: 0,
      label: 'Unlocked',
    });
  });

  it('renders modal when activeModal is "unlock"', () => {
    renderWithProviders(createElement(UnlockModal));
    expect(screen.getByText('Unlock XLM')).toBeTruthy();
    expect(screen.getByText('Amount locked')).toBeTruthy();
    // "100 XLM" appears in both "Amount locked" and "Available to unlock"
    expect(screen.getAllByText('100 XLM').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render modal content when position is null', () => {
    vi.mocked(useFarmStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) => {
      return selector({ activeModal: 'unlock', selectedPosition: null, close: vi.fn() });
    });
    renderWithProviders(createElement(UnlockModal));
    // Modal should not show Unlock header
    expect(screen.queryByText('Unlock XLM')).toBeNull();
  });

  it('shows countdown warning and disables input if lock period not elapsed', () => {
    vi.mocked(useCountdown).mockReturnValue({
      isElapsed: false,
      remainingMs: 50000,
      label: '1 hour remaining',
    });
    renderWithProviders(createElement(UnlockModal));

    expect(screen.getByText(/Assets are time-locked for security/i)).toBeTruthy();

    const input = screen.getByPlaceholderText('Amount') as HTMLInputElement;
    expect(input.disabled).toBe(true);

    const button = screen.getByRole('button', { name: /Unlock with Freighter/i });
    expect(button).toHaveProperty('disabled', true);
  });

  it('validates amount: below minimum', () => {
    renderWithProviders(createElement(UnlockModal));
    const input = screen.getByPlaceholderText('Amount');

    fireEvent.change(input, { target: { value: '0.005' } });

    expect(screen.getByText('Minimum unlock amount is 0.01 XLM.')).toBeTruthy();
    const button = screen.getByRole('button', { name: /Unlock with Freighter/i });
    expect(button).toHaveProperty('disabled', true);
  });

  it('validates amount: exceeds balance', () => {
    renderWithProviders(createElement(UnlockModal));
    const input = screen.getByPlaceholderText('Amount');

    fireEvent.change(input, { target: { value: '150' } });

    expect(screen.getByText('Amount exceeds locked balance of 100 XLM.')).toBeTruthy();
    const button = screen.getByRole('button', { name: /Unlock with Freighter/i });
    expect(button).toHaveProperty('disabled', true);
  });

  it('sets 50% and max amounts correctly', () => {
    renderWithProviders(createElement(UnlockModal));
    const input = screen.getByPlaceholderText('Amount') as HTMLInputElement;

    // Test 50%
    fireEvent.click(screen.getByText('50%'));
    expect(input.value).toBe('50');

    // Test Max
    fireEvent.click(screen.getByText('Max'));
    expect(input.value).toBe('100');
  });

  it('handles successful unlock flow', async () => {
    vi.mocked(unlockAssets).mockImplementation(async (args: Record<string, unknown>) => {
      const onStep = args.onStep as ((s: string) => void) | undefined;
      const onHash = args.onHash as ((h: string) => void) | undefined;
      onStep?.('simulating');
      onStep?.('signing');
      onStep?.('submitting');
      onHash?.('test-hash-abc');
      return { success: true, hash: 'test-hash-abc', status: 'SUCCESS' };
    });

    renderWithProviders(createElement(UnlockModal));
    const input = screen.getByPlaceholderText('Amount');
    fireEvent.change(input, { target: { value: '50' } });

    const button = screen.getByRole('button', { name: /Unlock with Freighter/i });
    fireEvent.click(button);

    // Wait for the modal to show success state — the Badge text
    await waitFor(() => {
      expect(screen.getByText('Unlock confirmed')).toBeTruthy();
    });

    // Check the explorer link
    const link = screen.getByRole('link', { name: /View on Stellar Expert/i });
    expect(link.getAttribute('href')).toContain('test-hash-abc');
  });

  it('handles unlock error flow — result.success === false', async () => {
    vi.mocked(unlockAssets).mockImplementation(async (args: Record<string, unknown>) => {
      const onStep = args.onStep as ((s: string) => void) | undefined;
      onStep?.('simulating');
      return {
        success: false,
        status: 'FAILED',
        error: 'Insufficient balance to cover this transaction. Please ensure your wallet has enough funds.',
      };
    });

    renderWithProviders(createElement(UnlockModal));
    const input = screen.getByPlaceholderText('Amount');
    fireEvent.change(input, { target: { value: '50' } });

    const button = screen.getByRole('button', { name: /Unlock with Freighter/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Insufficient balance/i)).toBeTruthy();
    });

    // Button should be re-enabled after error
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Unlock with Freighter/i });
      expect(btn).toHaveProperty('disabled', false);
    });
  });
});
