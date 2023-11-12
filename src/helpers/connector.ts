import { initializeConnector } from '@web3-react/core'
import { MetaMask } from '@web3-react/metamask'
import { ethers } from 'ethers'

/**
 * This handles the connection to the MetaMask wallet. In this project it is only used for its connection hooks.
 * While it is a singleton that allows for easy interaction with web3 providers throughout the app through the useWeb3React hook. 
 * It uses the deprecated ethersV5, and thus its provider is not up to date with EIP-1193 and signing messages is 
 * not possible with the provider returned by this connector.
 */
export const [metaMask, hooks] = initializeConnector<MetaMask>((actions) => new MetaMask({ actions }))

export const isAccountActive = (address: string|undefined, account: string|undefined): boolean => {
    if (!account || !address) return false;
    function handleCheckSumCompare(address: string, address2: string) {
      return (
        ethers.isAddress(address) &&
        ethers.isAddress(address2) &&
        ethers.getAddress(address) === ethers.getAddress(address2)
      );
    }
    return handleCheckSumCompare(account, address);
  };