import * as React from 'react'

// Styled Components
import {
  HeaderTitle,
  HeaderWrapper,
  ActionIcon,
  ExpandIcon
} from './style'
import { WalletMorePopup } from '../../desktop'
import { getLocale } from '../../../../common/locale'

export interface Props {
  onExpand: () => void
  onClickMore: () => void
  onClickLock: () => void
  onClickSetting: () => void
  showMore: boolean
}

const ConnectedHeader = (props: Props) => {
  const { onClickLock, onClickMore, onClickSetting, onExpand, showMore } = props
  return (
    <HeaderWrapper>
      <ExpandIcon onClick={onExpand} />
      <HeaderTitle>{getLocale('braveWalletPanelTitle')}</HeaderTitle>
      <ActionIcon onClick={onClickMore} />
      {showMore &&
        <WalletMorePopup
          onClickLock={onClickLock}
          onClickSetting={onClickSetting}
        />
      }
    </HeaderWrapper>
  )
}

export default ConnectedHeader
