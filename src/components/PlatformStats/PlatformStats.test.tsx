import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PlatformStats } from './PlatformStats';
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
        // getPlatformStats returns totalValueLocked already formatted via
        // toLocaleString (currency USD), so the component must not re-format it.
        tvl: '$42,300,000',
        activePools: 12,
        totalFarmers: 15450,
        creditVelocity: '8500000000000'
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
});
