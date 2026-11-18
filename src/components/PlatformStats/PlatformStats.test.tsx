import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { METRIC_HELP, PlatformStats } from './PlatformStats';
import * as hooks from '@/hooks/useSorobanQuery';
import { ChakraProvider } from '@chakra-ui/react';

vi.mock('@/hooks/useSorobanQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useSorobanQuery')>();
  return { ...actual, usePlatformStats: vi.fn() };
});

describe('<PlatformStats /> Layout Component', () => {
  it('matches baseline style design snapshot tests', () => {
    vi.spyOn(hooks, 'usePlatformStats').mockReturnValue({
      data: {
        // Production-shaped values: getPlatformStats formats TVL with
        // toLocaleString({ style: 'currency' }), and getCreditVelocity returns
        // a raw credit-unit count that formatCredits scales for display.
        tvl: '$3,500',
        activePools: 12,
        totalFarmers: 15450,
        creditVelocity: '8500000000000',
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof hooks.usePlatformStats>);

    const { asFragment } = render(
      <ChakraProvider>
        <PlatformStats />
      </ChakraProvider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  // #769 — every metric explains itself, and the explanation is reachable by
  // keyboard (the label is focusable, so its tooltip opens on focus).
  it('gives every metric a focusable label with an explanation', () => {
    vi.spyOn(hooks, 'usePlatformStats').mockReturnValue({
      data: { tvl: '', activePools: 1, totalFarmers: 1, creditVelocity: '0' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof hooks.usePlatformStats>);

    render(
      <ChakraProvider>
        <PlatformStats />
      </ChakraProvider>
    );

    for (const label of ['Total Value Locked', 'Active Pools', 'Total Farmers', '24h Credit Velocity']) {
      expect(screen.getByText(label).getAttribute('tabindex')).toBe('0');
    }
    for (const help of Object.values(METRIC_HELP)) {
      expect(help.length).toBeGreaterThan(10);
    }
  });
});
