import { initializeConnector } from '@web3-react/core'
import { MetaMask } from '@web3-react/metamask'
import { ethers } from 'ethers'

export const [metaMask, hooks] = initializeConnector<MetaMask>((actions) => new MetaMask({ actions }))

export const isAccountActive = (address: string|undefined, accounts: string[]|undefined): boolean => {
    if (!accounts || !address) return false;
    function handleCheckSumCompare(address: string, address2: string) {
      return (
        ethers.isAddress(address) &&
        ethers.isAddress(address2) &&
        ethers.getAddress(address) === ethers.getAddress(address2)
      );
    }
    return accounts?.some((account) => handleCheckSumCompare(account, address));
  };