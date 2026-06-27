import { describe, expect, it } from 'vitest';
import { Address, type xdr } from '@stellar/stellar-sdk';
import { SecurityError } from './error-handler';
import { validateSimulationAuth } from './soroban';

describe('validateSimulationAuth', () => {
  const contractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

  it('throws SecurityError when simulation includes an extra unexpected auth entry', () => {
    const unexpectedAuthEntry = {} as xdr.SorobanAuthorizationEntry;

    const simResult = {
      result: {
        auth: [unexpectedAuthEntry, unexpectedAuthEntry],
      },
    };

    expect(() =>
      validateSimulationAuth(simResult, [
        {
          contractId,
          functionName: 'unlock_assets',
        },
      ]),
    ).toThrow(SecurityError);
  });

  it('throws SecurityError when expected root auth includes nested sub-invocations', () => {
    const authEntry = {
      credentials: () => ({}),
      rootInvocation: () => ({
        function: () => ({
          switch: () => 'contract',
          contractFn: () => ({
            contractAddress: () => Address.fromString(contractId).toScAddress(),
            functionName: () => 'unlock_assets',
          }),
        }),
        subInvocations: () => [
          {
            function: () => ({
              switch: () => 'contract',
              contractFn: () => ({
                contractAddress: () => Address.fromString(contractId).toScAddress(),
                functionName: () => 'malicious_call',
              }),
            }),
            subInvocations: () => [],
          },
        ],
      }),
    } as xdr.SorobanAuthorizationEntry;

    const simResult = {
      result: {
        auth: [authEntry],
      },
    };

    expect(() =>
      validateSimulationAuth(simResult, [
        {
          contractId,
          functionName: 'unlock_assets',
        },
      ]),
    ).toThrow(SecurityError);
  });
});
