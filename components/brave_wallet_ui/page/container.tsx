// Copyright (c) 2020 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// you can obtain one at http://mozilla.org/MPL/2.0/.

import * as React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Switch, Route, useHistory, useLocation } from 'react-router-dom'
import BigNumber from 'bignumber.js'

import * as WalletPageActions from './actions/wallet_page_actions'
import * as WalletActions from '../common/actions/wallet_actions'
import store from './store'

import 'emptykit.css'
import '../../../ui/webui/resources/fonts/poppins.css'
import '../../../ui/webui/resources/fonts/muli.css'

import { WalletWidgetStandIn } from '../stories/style'
import {
  // SideNav,
  WalletPageLayout,
  WalletSubViewLayout,
  CryptoView,
  LockScreen,
  OnboardingRestore
} from '../components/desktop'
import {
  // NavTypes,
  WalletState,
  PageState,
  WalletPageState,
  AssetPriceTimeframe,
  AccountAssetOptionType,
  WalletAccountType,
  TokenInfo,
  UpdateAccountNamePayloadType,
  EthereumChain,
  WalletRoutes,
  BuySendSwapTypes
} from '../constants/types'
// import { NavOptions } from '../options/side-nav-options'
import BuySendSwap from '../stories/screens/buy-send-swap'
import Onboarding from '../stories/screens/onboarding'
import BackupWallet from '../stories/screens/backup-wallet'
import { formatWithCommasAndDecimals } from '../utils/format-prices'
import { BuyAssetUrl } from '../utils/buy-asset-url'
import { convertMojoTimeToJS } from '../utils/datetime-utils'
import { WyreAccountAssetOptions } from '../options/wyre-asset-options'
import {
  HardwareWalletAccount
} from '../components/desktop/popup-modals/add-account-modal/hardware-wallet-connect/types'

import {
  onConnectHardwareWallet,
  getBalance,
  getERC20Allowance,
  findENSAddress,
  findUnstoppableDomainAddress
} from '../common/async/wallet_async_handler'

import { formatBalance } from '../utils/format-balances'
import { useSwap, useAssets, useTimeout, useBalance, useSend } from '../common/hooks'
import { stripERC20TokenImageURL } from '../utils/string-utils'

type Props = {
  wallet: WalletState
  page: PageState
  walletPageActions: typeof WalletPageActions
  walletActions: typeof WalletActions
}

function Container (props: Props) {
  let history = useHistory()
  const { pathname: walletLocation } = useLocation()
  // Wallet Props
  const {
    isWalletCreated,
    isWalletLocked,
    isWalletBackedUp,
    hasIncorrectPassword,
    accounts,
    networkList,
    transactions,
    selectedNetwork,
    selectedAccount,
    hasInitialized,
    portfolioPriceHistory,
    selectedPortfolioTimeline,
    isFetchingPortfolioPriceHistory,
    transactionSpotPrices,
    addUserAssetError,
    defaultWallet
  } = props.wallet

  // Page Props
  const {
    invalidMnemonic,
    mnemonic,
    selectedTimeline,
    selectedAsset,
    selectedUSDAssetPrice,
    selectedBTCAssetPrice,
    selectedAssetPriceHistory,
    setupStillInProgress,
    isFetchingPriceHistory,
    privateKey,
    importError,
    showAddModal,
    isCryptoWalletsInstalled,
    isMetaMaskInstalled,
    swapQuote,
    swapError
  } = props.page

  // const [view, setView] = React.useState<NavTypes>('crypto')
  const [inputValue, setInputValue] = React.useState<string>('')
  const [buyAmount, setBuyAmount] = React.useState('')
  const [selectedWidgetTab, setSelectedWidgetTab] = React.useState<BuySendSwapTypes>('buy')

  const notifyUserInteraction = () => {
    props.walletActions.notifyUserInteraction()
  }
  useTimeout(notifyUserInteraction, isWalletLocked)

  const {
    tokenOptions,
    assetOptions,
    userVisibleTokenOptions,
    sendAssetOptions
  } = useAssets(selectedAccount, props.wallet.fullTokenList, props.wallet.userVisibleTokensInfo)

  const {
    exchangeRate,
    fromAmount,
    fromAsset,
    isSwapButtonDisabled,
    orderExpiration,
    orderType,
    slippageTolerance,
    swapValidationError,
    toAmount,
    toAsset,
    swapAssetOptions,
    customSlippageTolerance,
    onToggleOrderType,
    onSwapQuoteRefresh,
    onSetToAmount,
    onSetFromAmount,
    flipSwapAssets,
    onSubmitSwap,
    onSetExchangeRate,
    onSelectExpiration,
    onSelectSlippageTolerance,
    onSelectTransactAsset,
    onCustomSlippageToleranceChange
  } = useSwap(
    selectedAccount,
    selectedNetwork,
    assetOptions,
    props.walletPageActions.fetchPageSwapQuote,
    getERC20Allowance,
    props.walletActions.approveERC20Allowance,
    swapQuote,
    swapError
  )

  const {
    onSetSendAmount,
    onSetToAddressOrUrl,
    onSubmitSend,
    sendAmount,
    toAddressOrUrl,
    toAddress,
    addressError
  } = useSend(
    findENSAddress,
    findUnstoppableDomainAddress,
    selectedAccount,
    fromAsset,
    props.walletActions.sendERC20Transfer,
    props.walletActions.sendTransaction,
    props.walletActions.sendERC721TransferFrom
  )

  const getSelectedAccountBalance = useBalance(selectedAccount)
  const { assetBalance: fromAssetBalance } = getSelectedAccountBalance(fromAsset)

  const onToggleShowRestore = React.useCallback(() => {
    if (walletLocation === WalletRoutes.Restore) {
      history.goBack()
    } else {
      history.push(WalletRoutes.Restore)
    }
  }, [walletLocation])

  const onSetBuyAmount = (value: string) => {
    setBuyAmount(value)
  }

  const onSelectAccount = (account: WalletAccountType) => {
    props.walletActions.selectAccount(account)
  }

  const onSelectNetwork = (network: EthereumChain) => {
    props.walletActions.selectNetwork(network)
  }

  const completeWalletSetup = (recoveryVerified: boolean) => {
    if (recoveryVerified) {
      props.walletPageActions.walletBackupComplete()
    }
    props.walletPageActions.walletSetupComplete()
  }

  const onBackupWallet = () => {
    props.walletPageActions.walletBackupComplete()
    history.goBack()
  }

  const restoreWallet = (mnemonic: string, password: string, isLegacy: boolean) => {
    props.walletPageActions.restoreWallet({ mnemonic, password, isLegacy })
  }

  const passwordProvided = (password: string) => {
    props.walletPageActions.createWallet({ password })
  }

  const unlockWallet = () => {
    props.walletActions.unlockWallet({ password: inputValue })
    setInputValue('')
  }

  const lockWallet = () => {
    props.walletActions.lockWallet()
  }

  const onShowBackup = () => {
    props.walletPageActions.showRecoveryPhrase(true)
    history.push(WalletRoutes.Backup)
  }

  const onHideBackup = () => {
    props.walletPageActions.showRecoveryPhrase(false)
    history.goBack()
  }

  const handlePasswordChanged = (value: string) => {
    setInputValue(value)
    if (hasIncorrectPassword) {
      props.walletActions.hasIncorrectPassword(false)
    }
  }

  const restorError = React.useMemo(() => {
    if (invalidMnemonic) {
      setTimeout(function () { props.walletPageActions.hasMnemonicError(false) }, 5000)
      return true
    }
    return false
  }, [invalidMnemonic])

  const recoveryPhrase = React.useMemo(() => {
    return (mnemonic || '').split(' ')
  }, [mnemonic])

  // This will scrape all of the user's accounts and combine the asset balances for a single asset
  const fullAssetBalance = (asset: TokenInfo) => {
    const amounts = accounts.map((account) => {
      let balance = 0
      const found = account.tokens.find((token) => token.asset.contractAddress === asset.contractAddress)
      if (found) {
        balance = Number(formatBalance(found.assetBalance, found.asset.decimals))
      }
      return balance
    })
    const grandTotal = amounts.reduce(function (a, b) {
      return a + b
    }, 0)
    return grandTotal
  }

  // This will scrape all of the user's accounts and combine the fiat value for a single asset
  const fullAssetFiatBalance = (asset: TokenInfo) => {
    const amounts = accounts.map((account) => {
      let fiatBalance = 0
      const found = account.tokens.find((token) => token.asset.contractAddress === asset.contractAddress)
      if (found) {
        fiatBalance = Number(found.fiatBalance)
      }
      return fiatBalance
    })
    const grandTotal = amounts.reduce(function (a, b) {
      return a + b
    }, 0)
    return grandTotal
  }

  // This looks at the users asset list and returns the full balance for each asset
  const userAssetList = React.useMemo(() => {
    return userVisibleTokenOptions.map((asset) => ({
      asset: asset,
      assetBalance: fullAssetBalance(asset).toString(),
      fiatBalance: fullAssetFiatBalance(asset).toString()
    }))
  }, [userVisibleTokenOptions, accounts])

  const onSelectAsset = (asset: TokenInfo) => {
    props.walletPageActions.selectAsset({ asset: asset, timeFrame: selectedTimeline })
  }

  // This will scrape all of the user's accounts and combine the fiat value for every asset
  const fullPortfolioBalance = React.useMemo(() => {
    const amountList = userAssetList.map((item) => {
      return item.asset.visible ? fullAssetFiatBalance(item.asset) : 0
    })
    const grandTotal = amountList.reduce(function (a, b) {
      return a + b
    }, 0)
    return formatWithCommasAndDecimals(grandTotal.toString())
  }, [userAssetList])

  const onChangeTimeline = (timeline: AssetPriceTimeframe) => {
    if (selectedAsset) {
      props.walletPageActions.selectAsset({ asset: selectedAsset, timeFrame: timeline })
    } else {
      props.walletActions.selectPortfolioTimeline(timeline)
    }
  }

  const formatedPriceHistory = React.useMemo(() => {
    const formated = selectedAssetPriceHistory.map((obj) => {
      return {
        date: convertMojoTimeToJS(obj.date),
        close: Number(obj.price)
      }
    })
    return formated
  }, [selectedAssetPriceHistory])

  const onSelectPresetAmountFactory = (sendOrSwap: 'send' | 'swap') => (percent: number) => {
    const asset = selectedAccount.tokens.find(
      (token) => (
        token.asset.contractAddress === fromAsset.asset.contractAddress ||
        token.asset.symbol === fromAsset.asset.symbol
      )
    )
    const amount = new BigNumber(asset?.assetBalance || '0').times(percent).toString()
    const formattedAmount = formatBalance(amount.toString(), asset?.asset.decimals ?? 18)

    if (sendOrSwap === 'send') {
      onSetSendAmount(formattedAmount)
    } else {
      onSetFromAmount(formattedAmount)
    }
  }

  const onShowAddModal = () => {
    props.walletPageActions.setShowAddModal(true)
  }

  const onHideAddModal = () => {
    props.walletPageActions.setShowAddModal(false)
  }

  const onCreateAccount = (name: string) => {
    const created = props.walletPageActions.addAccount({ accountName: name })
    if (created) {
      onHideAddModal()
    }
  }

  const onSubmitBuy = (asset: AccountAssetOptionType) => {
    const url = BuyAssetUrl(selectedNetwork.chainId, asset, selectedAccount, buyAmount)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const onAddHardwareAccounts = (selected: HardwareWalletAccount[]) => {
    props.walletPageActions.addHardwareAccounts(selected)
  }

  const onImportAccount = (accountName: string, privateKey: string) => {
    props.walletPageActions.importAccount({ accountName, privateKey })
  }

  const onImportAccountFromJson = (accountName: string, password: string, json: string) => {
    props.walletPageActions.importAccountFromJson({ accountName, password, json })
  }

  const onSetImportError = (hasError: boolean) => {
    props.walletPageActions.setImportError(hasError)
  }

  const onRemoveAccount = (address: string, hardware: boolean) => {
    if (hardware) {
      props.walletPageActions.removeHardwareAccount({ address })
      return
    }
    props.walletPageActions.removeImportedAccount({ address })
  }

  const onUpdateAccountName = (payload: UpdateAccountNamePayloadType): { success: boolean } => {
    const result = props.walletPageActions.updateAccountName(payload)
    return result ? { success: true } : { success: false }
  }

  const fetchFullTokenList = () => {
    props.walletActions.getAllTokensList()
  }

  const onViewPrivateKey = (address: string, isDefault: boolean) => {
    props.walletPageActions.viewPrivateKey({ address, isDefault })
  }

  const onDoneViewingPrivateKey = () => {
    props.walletPageActions.doneViewingPrivateKey()
  }

  const onImportCryptoWallets = (password: string, newPassword: string) => {
    props.walletPageActions.importFromCryptoWallets({ password, newPassword })
  }

  const onImportMetaMask = (password: string, newPassword: string) => {
    props.walletPageActions.importFromMetaMask({ password, newPassword })
  }

  const checkWalletsToImport = () => {
    props.walletPageActions.checkWalletsToImport()
  }

  const onSetUserAssetVisible = (token: TokenInfo, isVisible: boolean) => {
    props.walletActions.setUserAssetVisible({ token, chainId: selectedNetwork.chainId, isVisible })
  }

  const onAddUserAsset = (token: TokenInfo) => {
    props.walletActions.addUserAsset({
      token: {
        ...token,
        logo: stripERC20TokenImageURL(token.logo)
      },
      chainId: selectedNetwork.chainId
    })
  }

  const onRemoveUserAsset = (token: TokenInfo) => {
    props.walletActions.removeUserAsset({ token, chainId: selectedNetwork.chainId })
  }

  const onOpenWalletSettings = () => {
    props.walletPageActions.openWalletSettings()
  }

  React.useEffect(() => {
    // Creates a list of Accepted Portfolio Routes
    const acceptedPortfolioRoutes = userVisibleTokenOptions.map((token) => {
      return `${WalletRoutes.Portfolio}/${token.symbol}`
    })
    // Creates a list of Accepted Account Routes
    const acceptedAccountRoutes = accounts.map((account) => {
      return `${WalletRoutes.Accounts}/${account.address}`
    })
    if (!hasInitialized) {
      return
    }
    // If wallet is not yet created will Route to Onboarding
    if ((!isWalletCreated || setupStillInProgress) && walletLocation !== WalletRoutes.Restore) {
      checkWalletsToImport()
      history.push(WalletRoutes.Onboarding)
      // If wallet is created will Route to login
    } else if (isWalletLocked && walletLocation !== WalletRoutes.Restore) {
      history.push(WalletRoutes.Unlock)
      // Allowed Private Routes if a wallet is unlocked else will redirect back to Portfolio
    } else if (
      !isWalletLocked &&
      hasInitialized &&
      walletLocation !== WalletRoutes.Backup &&
      walletLocation !== WalletRoutes.Accounts &&
      walletLocation !== WalletRoutes.AddAccountModal &&
      acceptedAccountRoutes.length !== 0 &&
      !acceptedAccountRoutes.includes(walletLocation) &&
      walletLocation !== WalletRoutes.Portfolio &&
      acceptedPortfolioRoutes.length !== 0 &&
      !acceptedPortfolioRoutes.includes(walletLocation)
    ) {
      history.push(WalletRoutes.Portfolio)
    }
  }, [
    walletLocation,
    isWalletCreated,
    isWalletLocked,
    hasInitialized,
    setupStillInProgress,
    selectedAsset,
    userVisibleTokenOptions,
    accounts
  ])

  const hideMainComponents = (isWalletCreated && !setupStillInProgress) && !isWalletLocked && walletLocation !== WalletRoutes.Backup

  return (
    <WalletPageLayout>
      {/* <SideNav
        navList={NavOptions}
        selectedButton={view}
        onSubmit={navigateTo}
      /> */}
      <Switch>
        <WalletSubViewLayout>
          <Route path={WalletRoutes.Restore} exact={true}>
            {isWalletLocked &&
              <OnboardingRestore
                onRestore={restoreWallet}
                toggleShowRestore={onToggleShowRestore}
                hasRestoreError={restorError}
              />
            }
          </Route>
          <Route path={WalletRoutes.Onboarding} exact={true}>
            <Onboarding
              recoveryPhrase={recoveryPhrase}
              onPasswordProvided={passwordProvided}
              onSubmit={completeWalletSetup}
              onShowRestore={onToggleShowRestore}
              braveLegacyWalletDetected={isCryptoWalletsInstalled}
              metaMaskWalletDetected={isMetaMaskInstalled}
              hasImportError={importError}
              onImportCryptoWallets={onImportCryptoWallets}
              onImportMetaMask={onImportMetaMask}
              onSetImportError={onSetImportError}
            />
          </Route>
          <Route path={WalletRoutes.Unlock} exact={true}>
            {isWalletLocked &&
              <LockScreen
                onSubmit={unlockWallet}
                disabled={inputValue === ''}
                onPasswordChanged={handlePasswordChanged}
                hasPasswordError={hasIncorrectPassword}
                onShowRestore={onToggleShowRestore}
              />
            }
          </Route>
          <Route path={WalletRoutes.Backup} exact={true}>
            <BackupWallet
              isOnboarding={false}
              onCancel={onHideBackup}
              onSubmit={onBackupWallet}
              recoveryPhrase={recoveryPhrase}
            />
          </Route>
          <Route path={WalletRoutes.CryptoPage} exact={true}>
            {hideMainComponents &&
              <CryptoView
                onLockWallet={lockWallet}
                needsBackup={!isWalletBackedUp}
                onShowBackup={onShowBackup}
                accounts={accounts}
                networkList={networkList}
                onChangeTimeline={onChangeTimeline}
                onSelectAsset={onSelectAsset}
                portfolioBalance={fullPortfolioBalance}
                selectedAsset={selectedAsset}
                selectedUSDAssetPrice={selectedUSDAssetPrice}
                selectedBTCAssetPrice={selectedBTCAssetPrice}
                selectedAssetPriceHistory={formatedPriceHistory}
                portfolioPriceHistory={portfolioPriceHistory}
                selectedTimeline={selectedTimeline}
                selectedPortfolioTimeline={selectedPortfolioTimeline}
                transactions={transactions}
                userAssetList={userAssetList}
                fullAssetList={tokenOptions}
                onConnectHardwareWallet={onConnectHardwareWallet}
                onCreateAccount={onCreateAccount}
                onImportAccount={onImportAccount}
                isLoading={isFetchingPriceHistory}
                showAddModal={showAddModal}
                onHideAddModal={onHideAddModal}
                onUpdateAccountName={onUpdateAccountName}
                fetchFullTokenList={fetchFullTokenList}
                selectedNetwork={selectedNetwork}
                onSelectNetwork={onSelectNetwork}
                isFetchingPortfolioPriceHistory={isFetchingPortfolioPriceHistory}
                onRemoveAccount={onRemoveAccount}
                privateKey={privateKey ?? ''}
                onDoneViewingPrivateKey={onDoneViewingPrivateKey}
                onViewPrivateKey={onViewPrivateKey}
                onImportAccountFromJson={onImportAccountFromJson}
                onSetImportError={onSetImportError}
                hasImportError={importError}
                onAddHardwareAccounts={onAddHardwareAccounts}
                transactionSpotPrices={transactionSpotPrices}
                userVisibleTokensInfo={userVisibleTokenOptions}
                getBalance={getBalance}
                onAddUserAsset={onAddUserAsset}
                onSetUserAssetVisible={onSetUserAssetVisible}
                onRemoveUserAsset={onRemoveUserAsset}
                addUserAssetError={addUserAssetError}
                defaultWallet={defaultWallet}
                onOpenWalletSettings={onOpenWalletSettings}
                onShowAddModal={onShowAddModal}
              />
            }
          </Route>
        </WalletSubViewLayout>
      </Switch>
      {hideMainComponents &&
        <WalletWidgetStandIn>
          <BuySendSwap
            accounts={accounts}
            networkList={networkList}
            orderType={orderType}
            swapToAsset={toAsset}
            swapFromAsset={fromAsset}
            selectedNetwork={selectedNetwork}
            selectedAccount={selectedAccount}
            selectedTab={selectedWidgetTab}
            exchangeRate={exchangeRate}
            buyAmount={buyAmount}
            sendAmount={sendAmount}
            fromAmount={fromAmount}
            fromAssetBalance={fromAssetBalance}
            toAmount={toAmount}
            addressError={addressError}
            toAssetBalance='0'
            orderExpiration={orderExpiration}
            slippageTolerance={slippageTolerance}
            swapValidationError={swapValidationError}
            toAddressOrUrl={toAddressOrUrl}
            toAddress={toAddress}
            buyAssetOptions={WyreAccountAssetOptions}
            sendAssetOptions={sendAssetOptions}
            swapAssetOptions={swapAssetOptions}
            isSwapSubmitDisabled={isSwapButtonDisabled}
            customSlippageTolerance={customSlippageTolerance}
            onCustomSlippageToleranceChange={onCustomSlippageToleranceChange}
            onSetBuyAmount={onSetBuyAmount}
            onSetToAddressOrUrl={onSetToAddressOrUrl}
            onSelectExpiration={onSelectExpiration}
            onSelectPresetFromAmount={onSelectPresetAmountFactory('swap')}
            onSelectPresetSendAmount={onSelectPresetAmountFactory('send')}
            onSelectSlippageTolerance={onSelectSlippageTolerance}
            onSetExchangeRate={onSetExchangeRate}
            onSetSendAmount={onSetSendAmount}
            onSetFromAmount={onSetFromAmount}
            onSetToAmount={onSetToAmount}
            onSubmitSwap={onSubmitSwap}
            onSubmitSend={onSubmitSend}
            onSubmitBuy={onSubmitBuy}
            flipSwapAssets={flipSwapAssets}
            onSelectNetwork={onSelectNetwork}
            onSelectAccount={onSelectAccount}
            onToggleOrderType={onToggleOrderType}
            onSelectAsset={onSelectTransactAsset}
            onSelectTab={setSelectedWidgetTab}
            onSwapQuoteRefresh={onSwapQuoteRefresh}
          />
        </WalletWidgetStandIn>
      }
    </WalletPageLayout>
  )
}

function mapStateToProps (state: WalletPageState): Partial<Props> {
  return {
    page: state.page,
    wallet: state.wallet
  }
}

function mapDispatchToProps (dispatch: Dispatch): Partial<Props> {
  return {
    walletPageActions: bindActionCreators(WalletPageActions, store.dispatch.bind(store)),
    walletActions: bindActionCreators(WalletActions, store.dispatch.bind(store))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Container)
