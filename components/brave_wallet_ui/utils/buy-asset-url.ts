import { KnownNetwork, AssetOptionType, UserAccountType } from '../constants/types'

const wyreID = 'AC_MGNVBGHPA9T'

export function BuyAssetUrl (networkChainId: string, asset: AssetOptionType, account: UserAccountType, buyAmount: string) {
  switch (networkChainId) {
    case KnownNetwork.Mainnet:
      return `https://pay.sendwyre.com/?dest=ethereum:${account.address}&destCurrency=${asset.symbol}&amount=${buyAmount}&accountId=${wyreID}&paymentMethod=debit-card`
    case KnownNetwork.Ropsten:
      return 'https://faucet.metamask.io/'
    case KnownNetwork.Kovan:
      return 'https://github.com/kovan-testnet/faucet'
    case KnownNetwork.Rinkeby:
      return 'https://www.rinkeby.io/'
    case KnownNetwork.Goerli:
      return 'https://goerli-faucet.slock.it/'
    default:
      throw new Error(`Unknown cryptocurrency exchange or faucet: "${networkChainId}"`)
  }
}
