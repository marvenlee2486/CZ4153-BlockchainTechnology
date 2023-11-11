import { useEffect, useState } from "react";
import { hooks, metaMask } from "../helpers/connector";
import { Status } from "./Status";
import { Chain } from "./Chain";
import { Accounts } from "./Accounts";
const {
  useChainId,
  useAccounts,
  useIsActivating,
  useIsActive,
  useProvider,
  useENSNames,
} = hooks;

/**
 * Deprecated not used.
 * @returns
 */
export default function MetaMaskCard() {
  const chainId = useChainId();
  const accounts = useAccounts();
  const isActivating = useIsActivating();
  const isActive = useIsActive();
  const provider = useProvider();
  const ENSNames = useENSNames(provider);

  const [error, setError] = useState(undefined);

  // attempt to connect eagerly on mount
  useEffect(() => {
    void metaMask.connectEagerly().catch(() => {
      console.debug("Failed to connect eagerly to metamask");
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-1 p-5 rounded-sm">
      <Status isActivating={isActivating} isActive={isActive} error={error} />
      <div className="w-auto h-10 text-black">
        <Chain chainId={chainId} />
      </div>
      <Accounts accounts={accounts} provider={provider} ENSNames={ENSNames} />
      {isActivating ? (
        <div>Activating...</div>
      ) : isActive ? (
        <button
          onClick={() => {
            if (metaMask?.deactivate) {
              void metaMask.deactivate();
            } else {
              void metaMask.resetState();
            }
          }}
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={() => {
            void metaMask.activate();
          }}
        >
          Connect
        </button>
      )}
    </div>
  );
}
