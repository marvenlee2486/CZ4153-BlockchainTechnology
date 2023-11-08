import { initializeConnector } from '@web3-react/core'
import { MetaMask } from '@web3-react/metamask'
import { ethers } from 'ethers'

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