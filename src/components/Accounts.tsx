import type { BigNumber } from "@ethersproject/bignumber";
import { formatEther } from "@ethersproject/units";
import type { Web3ReactHooks } from "@web3-react/core";
import { useEffect, useState } from "react";

/**
 * Deprecated not used.
 * Uses the Web3React libray to get the balances of the connected accounts.
 * @returns Component that displays the balances of the connected accounts.
 */
function useBalances(
  provider?: ReturnType<Web3ReactHooks["useProvider"]>,
  accounts?: string[]
): BigNumber[] | undefined {
  const [balances, setBalances] = useState<BigNumber[] | undefined>();

  useEffect(() => {
    if (provider && accounts?.length) {
      let stale = false;

      void Promise.all(
        accounts.map((account) => provider.getBalance(account))
      ).then((balances) => {
        if (stale) return;
        setBalances(balances);
      });

      return () => {
        stale = true;
        setBalances(undefined);
      };
    }
  }, [provider, accounts]);

  return balances;
}

export function Accounts({
  accounts,
  provider,
  ENSNames,
}: {
  accounts: ReturnType<Web3ReactHooks["useAccounts"]>;
  provider: ReturnType<Web3ReactHooks["useProvider"]>;
  ENSNames: ReturnType<Web3ReactHooks["useENSNames"]>;
}) {
  const balances = useBalances(provider, accounts);

  if (accounts === undefined) return null;
  return (
    <div>
      Connected accounts:{" "}
      <b>
        {accounts.length === 0
          ? "None"
          : accounts?.map((account, i) => (
              <ul
                className={`${i === accounts?.length - 1 && "border-b-2"} ${
                  i === 0 && "text-green-400"
                } border-black text-ellipsis m-0 overflow-hidden border-x-2 border-t-2`}
                key={account}
              >
                {ENSNames?.[i] ?? account}
                {balances?.[i] ? ` (ETH ${formatEther(balances[i])})` : null}
              </ul>
            ))}
      </b>
    </div>
  );
}
