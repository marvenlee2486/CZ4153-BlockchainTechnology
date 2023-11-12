import type { AddEthereumChainParameter } from '@web3-react/types'

const ETH: AddEthereumChainParameter['nativeCurrency'] = {
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
}

interface BasicChainInformation {
  urls: string[]
  name: string
}

interface ExtendedChainInformation extends BasicChainInformation {
  nativeCurrency: AddEthereumChainParameter['nativeCurrency']
  blockExplorerUrls: AddEthereumChainParameter['blockExplorerUrls']
}

function isExtendedChainInformation(
  chainInformation: BasicChainInformation | ExtendedChainInformation
): chainInformation is ExtendedChainInformation {
  return !!(chainInformation as ExtendedChainInformation).nativeCurrency
}

export function getAddChainParameters(chainId: number): AddEthereumChainParameter | number {
  const chainInformation = CHAINS[chainId]
  if (isExtendedChainInformation(chainInformation)) {
    return {
      chainId,
      chainName: chainInformation.name,
      nativeCurrency: chainInformation.nativeCurrency,
      rpcUrls: chainInformation.urls,
      blockExplorerUrls: chainInformation.blockExplorerUrls,
    }
  } else {
    return chainId
  }
}

// const getInfuraUrlFor = (network: string) =>
//   process.env.infuraKey ? `https://${network}.infura.io/v3/${process.env.infuraKey}` : undefined
// const getAlchemyUrlFor = (network: string) =>
//   process.env.alchemyKey ? `https://${network}.alchemyapi.io/v2/${process.env.alchemyKey}` : undefined

type ChainConfig = { [chainId: number]: BasicChainInformation | ExtendedChainInformation }

// export const MAINNET_CHAINS: ChainConfig = {
//   1: {
//     urls: [getInfuraUrlFor('mainnet'), getAlchemyUrlFor('eth-mainnet'), 'https://cloudflare-eth.com'].filter(Boolean),
//     name: 'Mainnet',
//   },
//   10: {
//     urls: [getInfuraUrlFor('optimism-mainnet'), 'https://mainnet.optimism.io'].filter(Boolean),
//     name: 'Optimism',
//     nativeCurrency: ETH,
//     blockExplorerUrls: ['https://optimistic.etherscan.io'],
// }

export const TESTNET_CHAINS: ChainConfig = {
  1337: {
    urls: ['http://127.0.0.1:8545/'],
    name: 'localhost',
    nativeCurrency: ETH,
  },
}

export const CHAINS: ChainConfig = {
  // ...MAINNET_CHAINS,
  ...TESTNET_CHAINS,
}

export const URLS: { [chainId: number]: string[] } = Object.keys(CHAINS).reduce<{ [chainId: number]: string[] }>(
  (accumulator, chainId) => {
    const validURLs: string[] = CHAINS[Number(chainId)].urls

    if (validURLs.length) {
      accumulator[Number(chainId)] = validURLs
    }

    return accumulator
  },
  {}
)