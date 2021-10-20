// Copyright (c) 2021 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// you can obtain one at http://mozilla.org/MPL/2.0/.

import { MiddlewareAPI, Dispatch, AnyAction } from 'redux'
import { SimpleActionCreator } from 'redux-act'
import AsyncActionHandler from '../../../common/AsyncActionHandler'
import * as WalletActions from '../actions/wallet_actions'
import {
  UnlockWalletPayloadType,
  ChainChangedEventPayloadType,
  InitializedPayloadType,
  AddUserAssetPayloadType,
  SetUserAssetVisiblePayloadType,
  RemoveUserAssetPayloadType,
  SwapParamsPayloadType,
  UpdateUnapprovedTransactionGasFieldsType,
  RemoveSitePermissionPayloadType
} from '../constants/action_types'
import {
  AppObjectType,
  APIProxyControllers,
  EthereumChain,
  WalletState,
  WalletPanelState,
  AssetPriceTimeframe,
  SendTransactionParams,
  TransactionInfo,
  WalletAccountType,
  ER20TransferParams,
  ERC721TransferFromParams,
  SwapErrorResponse,
  SwapResponse,
  TokenInfo,
  ApproveERC20Params
} from '../../constants/types'
import { GetNetworkInfo } from '../../utils/network-utils'
import { formatBalance, toWeiHex } from '../../utils/format-balances'
import {
  HardwareWalletAccount,
  HardwareWalletConnectOpts
} from '../../components/desktop/popup-modals/add-account-modal/hardware-wallet-connect/types'
import getSwapConfig from '../../constants/swap.config'
import { hexStrToNumberArray } from '../../utils/hex-utils'

type Store = MiddlewareAPI<Dispatch<AnyAction>, any>

const handler = new AsyncActionHandler()

async function getAPIProxy (): Promise<APIProxyControllers> {
  let api
  if (window.location.hostname === 'wallet-panel.top-chrome') {
    api = await import('../../panel/wallet_panel_api_proxy.js')
  } else {
    api = await import('../../page/wallet_page_api_proxy.js')
  }
  return api.default.getInstance()
}

function getWalletState (store: MiddlewareAPI<Dispatch<AnyAction>, any>): WalletState {
  return (store.getState() as WalletPanelState).wallet
}

async function getTokenPriceHistory (store: Store) {
  const apiProxy = await getAPIProxy()
  const assetPriceController = apiProxy.assetRatioController
  const state = getWalletState(store)
  const result = await Promise.all(state.accounts.map(async (account) => {
    return Promise.all(account.tokens.map(async (token) => {
      return {
        token: token,
        history: await assetPriceController.getPriceHistory(token.asset.symbol.toLowerCase(), state.selectedPortfolioTimeline)
      }
    }))
  }))
  store.dispatch(WalletActions.portfolioPriceHistoryUpdated(result))
}

async function findHardwareAccountInfo (address: string) {
  const apiProxy = await getAPIProxy()
  const hardwareAccounts = await apiProxy.keyringController.getHardwareAccounts()
  for (const account of hardwareAccounts.accounts) {
    if (account.address.toLowerCase() === address) {
      return account
    }
  }
  return null
}

export async function findENSAddress (address: string) {
  const apiProxy = await getAPIProxy()
  const result = await apiProxy.ethJsonRpcController.ensGetEthAddr(address)
  return result
}

export async function findUnstoppableDomainAddress (address: string) {
  const apiProxy = await getAPIProxy()
  const result = await apiProxy.ethJsonRpcController.unstoppableDomainsGetEthAddr(address)
  return result
}

async function refreshWalletInfo (store: Store) {
  const apiProxy = await getAPIProxy()
  const walletHandler = apiProxy.walletHandler
  const ethJsonRpcController = apiProxy.ethJsonRpcController
  const assetPriceController = apiProxy.assetRatioController
  const result = await walletHandler.getWalletInfo()
  const hardwareAccounts = await apiProxy.keyringController.getHardwareAccounts()
  result.accountInfos = [...result.accountInfos, ...hardwareAccounts.accounts]

  // Get/Set selectedAccount
  if (result.isWalletCreated) {

    // Get selectedAccountAddress
    const getSelectedAccount = await apiProxy.keyringController.getSelectedAccount()
    const selectedAddress = getSelectedAccount.address

    // Fallback account address if selectedAccount returns null
    const fallbackAddress = result.accountInfos[0].address

    // If selectedAccount is null will setSelectedAccount to fallback address
    if (!selectedAddress) {
      await apiProxy.keyringController.setSelectedAccount(fallbackAddress)
      result.selectedAccount = fallbackAddress
    } else {
      // If a user has already created an wallet but then chooses to restore
      // a different wallet, getSelectedAccount still returns the previous wallets
      // selected account.
      // This check looks to see if the returned selectedAccount exist in the accountInfos
      // payload, if not it will setSelectedAccount to the fallback address
      if (!result.accountInfos.find((account) => account.address.toLowerCase() === selectedAddress?.toLowerCase())) {
        result.selectedAccount = fallbackAddress
        await apiProxy.keyringController.setSelectedAccount(fallbackAddress)
      } else {
        result.selectedAccount = selectedAddress
      }
    }
  }

  store.dispatch(WalletActions.initialized(result))
  const networkList = await ethJsonRpcController.getAllNetworks()
  store.dispatch(WalletActions.setAllNetworks(networkList))
  const chainId = await ethJsonRpcController.getChainId()
  const currentNetwork = GetNetworkInfo(chainId.chainId, networkList.networks)
  store.dispatch(WalletActions.setNetwork(currentNetwork))
  const state = getWalletState(store)

  // Populate tokens from ERC-20 token registry.
  if (state.fullTokenList.length === 0) {
    store.dispatch(WalletActions.getAllTokensList())
  }

  const braveWalletService = apiProxy.braveWalletService
  const defaultWallet = await braveWalletService.getDefaultWallet()
  store.dispatch(WalletActions.defaultWalletUpdated(defaultWallet.defaultWallet))
  const visibleTokensInfo = await braveWalletService.getUserAssets(chainId.chainId)

  // Selected Network's Base Asset
  const initialToken: TokenInfo[] = [{
    contractAddress: '',
    decimals: currentNetwork.decimals,
    isErc20: false,
    isErc721: false,
    logo: '',
    name: currentNetwork.symbolName,
    symbol: currentNetwork.symbol,
    visible: false
  }]

  const visibleTokens: TokenInfo[] = visibleTokensInfo.tokens.length === 0 ? initialToken : visibleTokensInfo.tokens
  store.dispatch(WalletActions.setVisibleTokensInfo(visibleTokens))

  // Update ETH Balances
  const getEthPrice = await assetPriceController.getPrice(['eth'], ['usd'], state.selectedPortfolioTimeline)
  const ethPrice = getEthPrice.success ? getEthPrice.values.find((i) => i.toAsset === 'usd')?.price ?? '0' : '0'
  const getBalanceReturnInfos = await Promise.all(state.accounts.map(async (account) => {
    const balanceInfo = await ethJsonRpcController.getBalance(account.address)
    return balanceInfo
  }))
  const balancesAndPrice = {
    usdPrice: ethPrice,
    balances: getBalanceReturnInfos
  }
  store.dispatch(WalletActions.ethBalancesUpdated(balancesAndPrice))

  // Update Token Balances
  if (visibleTokens) {
    const getTokenPrices = await Promise.all(visibleTokens.map(async (token) => {
      const emptyPrice = {
        assetTimeframeChange: '0',
        fromAsset: token.symbol,
        price: '0',
        toAsset: 'usd'
      }
      const price = await assetPriceController.getPrice([token.symbol.toLowerCase()], ['usd'], state.selectedPortfolioTimeline)
      return price.success ? price.values[0] : emptyPrice
    }))
    const getERCTokenBalanceReturnInfos = await Promise.all(state.accounts.map(async (account) => {
      return Promise.all(visibleTokens.map(async (token) => {
        if (token.isErc721) {
          return ethJsonRpcController.getERC721TokenBalance(token.contractAddress, token.tokenId ?? '', account.address)
        }
        return ethJsonRpcController.getERC20TokenBalance(token.contractAddress, account.address)
      }))
    }))
    const tokenBalancesAndPrices = {
      balances: getERCTokenBalanceReturnInfos,
      prices: { success: true, values: getTokenPrices }
    }
    store.dispatch(WalletActions.tokenBalancesUpdated(tokenBalancesAndPrices))
  }

  await getTokenPriceHistory(store)

  const getTransactions = await Promise.all(state.accounts.map(async (account) => {
    const transactions = await apiProxy.ethTxController.getAllTransactionInfo(account.address)
    return {
      account: {
        id: account.id,
        address: account.address,
        name: account.name
      },
      transactions: transactions.transactionInfos
    }
  }))
  store.dispatch(WalletActions.setTransactionList(getTransactions))

  // Get a list of accounts with permissions of the active origin
  const accounts = state.accounts
  const origin = state.activeOrigin
  const getAllPermissions = await Promise.all(accounts.map(async (account) => {
    const result = await braveWalletService.hasEthereumPermission(origin, account.address)
    if (result.hasPermission) {
      return account
    } else {
      return
    }
  }))
  const accountsWithPermission: (WalletAccountType | undefined)[] = getAllPermissions.filter((account) => account !== undefined)
  store.dispatch(WalletActions.setSitePermissions({ accounts: accountsWithPermission }))
}

handler.on(WalletActions.initialize.getType(), async (store) => {
  // Initialize active origin state.
  const braveWalletService = (await getAPIProxy()).braveWalletService
  const origin = await braveWalletService.getActiveOrigin()
  store.dispatch(WalletActions.activeOriginChanged(origin))
  await refreshWalletInfo(store)
})

handler.on(WalletActions.chainChangedEvent.getType(), async (store, payload: ChainChangedEventPayloadType) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.keyringCreated.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.keyringRestored.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.locked.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.unlocked.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.backedUp.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.accountsChanged.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.selectedAccountChanged.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.defaultWalletChanged.getType(), async (store) => {
  await refreshWalletInfo(store)
})

handler.on(WalletActions.lockWallet.getType(), async (store) => {
  const keyringController = (await getAPIProxy()).keyringController
  await keyringController.lock()
})

handler.on(WalletActions.unlockWallet.getType(), async (store, payload: UnlockWalletPayloadType) => {
  const keyringController = (await getAPIProxy()).keyringController
  const result = await keyringController.unlock(payload.password)
  store.dispatch(WalletActions.hasIncorrectPassword(!result.success))
})

handler.on(WalletActions.addFavoriteApp.getType(), async (store, appItem: AppObjectType) => {
  const walletHandler = (await getAPIProxy()).walletHandler
  await walletHandler.addFavoriteApp(appItem)
  await refreshWalletInfo(store)
})

handler.on(WalletActions.removeFavoriteApp.getType(), async (store, appItem: AppObjectType) => {
  const walletHandler = (await getAPIProxy()).walletHandler
  await walletHandler.removeFavoriteApp(appItem)
  await refreshWalletInfo(store)
})

handler.on(WalletActions.selectNetwork.getType(), async (store, payload: EthereumChain) => {
  const ethJsonRpcController = (await getAPIProxy()).ethJsonRpcController
  await ethJsonRpcController.setNetwork(payload.chainId)
  await refreshWalletInfo(store)
})

handler.on(WalletActions.selectAccount.getType(), async (store, payload: WalletAccountType) => {
  const apiProxy = await getAPIProxy()
  await apiProxy.keyringController.setSelectedAccount(payload.address)
  store.dispatch(WalletActions.setSelectedAccount(payload))
  const result = await apiProxy.ethTxController.getAllTransactionInfo(payload.address)
  store.dispatch(WalletActions.knownTransactionsUpdated(result.transactionInfos))
})

handler.on(WalletActions.initialized.getType(), async (store, payload: InitializedPayloadType) => {
  const apiProxy = await getAPIProxy()
  // This can be 0 when the wallet is locked
  if (payload.selectedAccount) {
    const result = await apiProxy.ethTxController.getAllTransactionInfo(payload.selectedAccount)
    store.dispatch(WalletActions.knownTransactionsUpdated(result.transactionInfos))
  }
})

handler.on(WalletActions.getAllNetworks.getType(), async (store) => {
  const ethJsonRpcController = (await getAPIProxy()).ethJsonRpcController
  const fullList = await ethJsonRpcController.getAllNetworks()
  store.dispatch(WalletActions.setAllNetworks(fullList))
})

handler.on(WalletActions.getAllTokensList.getType(), async (store) => {
  const ercTokenRegistry = (await getAPIProxy()).ercTokenRegistry
  const fullList = await ercTokenRegistry.getAllTokens()
  store.dispatch(WalletActions.setAllTokensList(fullList))
})

handler.on(WalletActions.addUserAsset.getType(), async (store, payload: AddUserAssetPayloadType) => {
  const braveWalletService = (await getAPIProxy()).braveWalletService
  const result = await braveWalletService.addUserAsset(payload.token, payload.chainId)
  store.dispatch(WalletActions.addUserAssetError(!result.success))
  await refreshWalletInfo(store)
})

handler.on(WalletActions.removeUserAsset.getType(), async (store, payload: RemoveUserAssetPayloadType) => {
  const braveWalletService = (await getAPIProxy()).braveWalletService
  await braveWalletService.removeUserAsset(payload.token, payload.chainId)
  await refreshWalletInfo(store)
})

handler.on(WalletActions.setUserAssetVisible.getType(), async (store, payload: SetUserAssetVisiblePayloadType) => {
  const braveWalletService = (await getAPIProxy()).braveWalletService
  await braveWalletService.setUserAssetVisible(payload.token, payload.chainId, payload.isVisible)
  await refreshWalletInfo(store)
})

handler.on(WalletActions.selectPortfolioTimeline.getType(), async (store, payload: AssetPriceTimeframe) => {
  store.dispatch(WalletActions.portfolioTimelineUpdated(payload))
  await getTokenPriceHistory(store)
})

handler.on(WalletActions.sendTransaction.getType(), async (store, payload: SendTransactionParams) => {
  const apiProxy = await getAPIProxy()
  /***
   * Determine whether to create a legacy or EIP-1559 transaction.
   *
   * isEIP1559 is true IFF:
   *   - network supports EIP-1559
   *   - keyring supports EIP-1559 (ex: certain hardware wallets vendors)
   *   - payload: SendTransactionParams has specified EIP-1559 gas-pricing
   *     fields.
   *
   * In all other cases, fallback to legacy gas-pricing fields.
   */
  let isEIP1559
  switch (true) {
    // Transaction payload has hardcoded EIP-1559 gas fields.
    case payload.maxPriorityFeePerGas !== undefined && payload.maxFeePerGas !== undefined:
      isEIP1559 = true
      break

    // Transaction payload has hardcoded legacy gas fields.
    case payload.gasPrice !== undefined:
      isEIP1559 = false
      break

    // Check if network and keyring support EIP-1559.
    default:
      const { selectedAccount, selectedNetwork } = getWalletState(store)
      let keyringSupportsEIP1559
      switch (selectedAccount.accountType) {
        case 'Primary':
        case 'Secondary':
        case 'Ledger':
          keyringSupportsEIP1559 = true
          break
        case 'Trezor':
          keyringSupportsEIP1559 = false
          break
        default:
          keyringSupportsEIP1559 = false
      }

      isEIP1559 = keyringSupportsEIP1559 && selectedNetwork.isEip1559
  }

  const { chainId } = await apiProxy.ethJsonRpcController.getChainId()

  const txData = isEIP1559
    ? apiProxy.makeEIP1559TxData(
      chainId,
      '0x1',

      // Estimated by eth_tx_controller if value is ''
      payload.maxPriorityFeePerGas || '',

      // Estimated by eth_tx_controller if value is ''
      payload.maxFeePerGas || '',

      // Estimated by eth_tx_controller if value is ''
      // FIXME: using empty string to auto-estimate gas limit throws the error:
      //  "Failed to get the gas limit for the transaction"
      payload.gas || '',
      payload.to,
      payload.value,
      payload.data || []
    )
    : apiProxy.makeTxData(
      '0x1' /* nonce */,

      // Estimated by eth_tx_controller if value is ''
      payload.gasPrice || '',

      // Estimated by eth_tx_controller if value is ''
      payload.gas || '',
      payload.to,
      payload.value,
      payload.data || []
    )

  const addResult = await (
    isEIP1559
      ? apiProxy.ethTxController.addUnapproved1559Transaction(txData, payload.from)
      : apiProxy.ethTxController.addUnapprovedTransaction(txData, payload.from)
  )
  if (!addResult.success) {
    console.log(
      `Sending unapproved transaction failed: ` +
      `from=${payload.from} err=${addResult.errorMessage} txData=`, txData
    )
    return
  }

  await refreshWalletInfo(store)
})

handler.on(WalletActions.sendERC20Transfer.getType(), async (store, payload: ER20TransferParams) => {
  const apiProxy = await getAPIProxy()
  const { data, success } = await apiProxy.ethTxController.makeERC20TransferData(payload.to, payload.value)
  if (!success) {
    console.log('Failed making ERC20 transfer data, to: ', payload.to, ', value: ', payload.value)
    return
  }

  await store.dispatch(WalletActions.sendTransaction({
    from: payload.from,
    to: payload.contractAddress,
    value: '0x0',
    gas: payload.gas,
    gasPrice: payload.gasPrice,
    maxPriorityFeePerGas: payload.maxPriorityFeePerGas,
    maxFeePerGas: payload.maxFeePerGas,
    data
  }))
})

handler.on(WalletActions.sendERC721TransferFrom.getType(), async (store, payload: ERC721TransferFromParams) => {
  const apiProxy = await getAPIProxy()
  const { data, success } = await apiProxy.ethTxController.makeERC721TransferFromData(payload.from, payload.to, payload.tokenId)
  if (!success) {
    console.log('Failed making ERC721 transferFrom data, from: ', payload.from, ', to: ', payload.to, ', tokenId: ', payload.tokenId)
    return
  }

  await store.dispatch(WalletActions.sendTransaction({
    from: payload.from,
    to: payload.contractAddress,
    value: '0x0',
    gas: payload.gas,
    gasPrice: payload.gasPrice,
    maxPriorityFeePerGas: payload.maxPriorityFeePerGas,
    maxFeePerGas: payload.maxFeePerGas,
    data
  }))
})

handler.on(WalletActions.approveERC20Allowance.getType(), async (store, payload: ApproveERC20Params) => {
  const apiProxy = await getAPIProxy()
  const { data, success } = await apiProxy.ethTxController.makeERC20ApproveData(payload.spenderAddress, payload.allowance)
  if (!success) {
    console.log(
      'Failed making ERC20 approve data, contract: ',
      payload.contractAddress,
      ', spender: ', payload.spenderAddress,
      ', allowance: ', payload.allowance
    )
    return
  }

  await store.dispatch(WalletActions.sendTransaction({
    from: payload.from,
    to: payload.contractAddress,
    value: '0x0',
    data
  }))
})

handler.on(WalletActions.approveTransaction.getType(), async (store, txInfo: TransactionInfo) => {
  const apiProxy = await getAPIProxy()
  const hardwareAccount = await findHardwareAccountInfo(txInfo.fromAddress)
  if (hardwareAccount && hardwareAccount.hardware) {
    const { success, message } = await apiProxy.ethTxController.approveHardwareTransaction(txInfo.id)
    if (success) {
      let deviceKeyring = await apiProxy.getKeyringsByType(hardwareAccount.hardware.vendor)
      const { v, r, s } = await deviceKeyring.signTransaction(hardwareAccount.hardware.path, message.replace('0x', ''))
      await apiProxy.ethTxController.processLedgerSignature(txInfo.id, '0x' + v, r, s)
      await refreshWalletInfo(store)
    }
    return
  }

  await apiProxy.ethTxController.approveTransaction(txInfo.id)
  await refreshWalletInfo(store)
})

handler.on(WalletActions.rejectTransaction.getType(), async (store, txInfo: TransactionInfo) => {
  const apiProxy = await getAPIProxy()
  await apiProxy.ethTxController.rejectTransaction(txInfo.id)
  await refreshWalletInfo(store)
})

handler.on(WalletActions.rejectAllTransactions.getType(), async (store) => {
  const state = getWalletState(store)
  const apiProxy = await getAPIProxy()
  state.pendingTransactions.forEach(async (transaction) => {
    await apiProxy.ethTxController.rejectTransaction(transaction.id)
  })
  await refreshWalletInfo(store)
})

export const onConnectHardwareWallet = (opts: HardwareWalletConnectOpts): Promise<HardwareWalletAccount[]> => {
  return new Promise(async (resolve, reject) => {
    const apiProxy = await getAPIProxy()
    const keyring = await apiProxy.getKeyringsByType(opts.hardware)
    keyring.getAccounts(opts.startIndex, opts.stopIndex, opts.scheme).then(async (accounts: HardwareWalletAccount[]) => {
      resolve(accounts)
    }).catch(reject)
  })
}

export const getBalance = (address: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const controller = (await getAPIProxy()).ethJsonRpcController
    const balance = await controller.getBalance(address)
    resolve(formatBalance(balance.balance, 18))
  })
}

// fetchSwapQuoteFactory creates a handler function that can be used with
// both panel and page actions.
export const fetchSwapQuoteFactory = (
  setSwapQuote: SimpleActionCreator<SwapResponse>,
  setSwapError: SimpleActionCreator<SwapErrorResponse | undefined>
) => async (store: Store, payload: SwapParamsPayloadType) => {
  const swapController = (await getAPIProxy()).swapController

  const {
    fromAsset,
    fromAssetAmount,
    toAsset,
    toAssetAmount,
    accountAddress,
    slippageTolerance,
    full
  } = payload

  const config = getSwapConfig(payload.networkChainId)

  const swapParams = {
    takerAddress: accountAddress,
    sellAmount: fromAssetAmount || '',
    buyAmount: toAssetAmount || '',
    buyToken: toAsset.asset.contractAddress || toAsset.asset.symbol,
    sellToken: fromAsset.asset.contractAddress || fromAsset.asset.symbol,
    buyTokenPercentageFee: config.buyTokenPercentageFee,
    slippagePercentage: slippageTolerance.slippage / 100,
    feeRecipient: config.feeRecipient,
    gasPrice: ''
  }

  const quote = await (
    full ? swapController.getTransactionPayload(swapParams) : swapController.getPriceQuote(swapParams)
  )

  if (quote.success && quote.response) {
    await store.dispatch(setSwapError(undefined))
    await store.dispatch(setSwapQuote(quote.response))

    if (full) {
      const {
        to,
        data,
        value,
        estimatedGas
      } = quote.response

      const params = {
        from: accountAddress,
        to,
        value: toWeiHex(value, 0),
        gas: toWeiHex(estimatedGas, 0),
        data: hexStrToNumberArray(data)
      }

      store.dispatch(WalletActions.sendTransaction(params))
    }
  } else if (quote.errorResponse) {
    try {
      const err = JSON.parse(quote.errorResponse) as SwapErrorResponse
      await store.dispatch(setSwapError(err))
    } catch (e) {
      console.error(`[swap] error parsing response: ${e}`)
    } finally {
      console.error(`[swap] error querying 0x API: ${quote.errorResponse}`)
    }
  }
}

handler.on(WalletActions.notifyUserInteraction.getType(), async (store) => {
  const keyringController = (await getAPIProxy()).keyringController
  await keyringController.notifyUserInteraction()
})

handler.on(WalletActions.refreshGasEstimates.getType(), async (store) => {
  const assetPriceController = (await getAPIProxy()).assetRatioController
  const basicEstimates = await assetPriceController.getGasOracle()
  if (!basicEstimates.estimation) {
    console.error(`Failed to fetch gas estimates`)
    return
  }

  store.dispatch(WalletActions.setGasEstimates(basicEstimates.estimation))
})

handler.on(WalletActions.updateUnapprovedTransactionGasFields.getType(), async (store, payload: UpdateUnapprovedTransactionGasFieldsType) => {
  const apiProxy = await getAPIProxy()

  const isEIP1559 = payload.maxPriorityFeePerGas !== undefined && payload.maxFeePerGas !== undefined

  if (isEIP1559) {
    const result = await apiProxy.ethTxController.setGasFeeAndLimitForUnapprovedTransaction(
      payload.txMetaId,
      payload.maxPriorityFeePerGas || '',
      payload.maxFeePerGas || '',
      payload.gasLimit
    )

    if (!result.success) {
      console.error(
        `Failed to update unapproved transaction: ` +
        `id=${payload.txMetaId} ` +
        `maxPriorityFeePerGas=${payload.maxPriorityFeePerGas}` +
        `maxFeePerGas=${payload.maxFeePerGas}` +
        `gasLimit=${payload.gasLimit}`
      )
    }
  }

  if (!isEIP1559 && payload.gasPrice) {
    const result = await apiProxy.ethTxController.setGasPriceAndLimitForUnapprovedTransaction(
      payload.txMetaId, payload.gasPrice, payload.gasLimit
    )

    if (!result.success) {
      console.error(
        `Failed to update unapproved transaction: ` +
        `id=${payload.txMetaId} ` +
        `gasPrice=${payload.gasPrice}` +
        `gasLimit=${payload.gasLimit}`
      )
    }
  }
})

export const getERC20Allowance = (contractAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const controller = (await getAPIProxy()).ethJsonRpcController
    const result = await controller.getERC20TokenAllowance(contractAddress, ownerAddress, spenderAddress)
    if (result.success) {
      resolve(result.allowance)
    } else {
      reject()
    }
  })
}

handler.on(WalletActions.removeSitePermission.getType(), async (store, payload: RemoveSitePermissionPayloadType) => {
  const braveWalletService = (await getAPIProxy()).braveWalletService
  await braveWalletService.resetEthereumPermission(payload.origin, payload.account)
  await refreshWalletInfo(store)
})

export default handler.middleware

// TODO(bbondy): Remove when we implement the transaction info
// const apiProxy = await getAPIProxy()
// const result = await apiProxy.ethTxController.getAllTransactionInfo('0x7f84E0DfF3ffd0af78770cF86c1b1DdFF99d51C7')
// console.log('transactionInfos: ', result.transactionInfos)
//
// TODO(bbondy): For swap usage (ERC20 approve)
//  const apiProxy = await getAPIProxy()
// const approveDataResult = await apiProxy.ethTxController.makeERC20ApproveData("0xBFb30a082f650C2A15D0632f0e87bE4F8e64460f", "0x0de0b6b3a7640000")
// const txData = apiProxy.makeTxData('0x1' /* nonce */, '0x20000000000', '0xFDE8', '0x774171b92Ba6e1d57ac08D6b77AbDD0B51660310', '0x0', approveDataResult.data)
// const addResult = await apiProxy.ethTxController.addUnapprovedTransaction(txData, '0x7f84E0DfF3ffd0af78770cF86c1b1DdFF99d51C7')
// if (!addResult.success) {
//   console.log('Adding unapproved transaction failed, txData: ', txData)
//   return
// }
