import * as React from 'react'
import { EthereumChain } from '../../../constants/types'
import { SelectNetwork } from '../../shared'
import { NetworkOptions } from '../../../options/network-options'
// Styled Components
import {
  StyledWrapper,
  OvalButton,
  OvalButtonText,
  CaratDownIcon,
  DropDown
} from './style'

export interface Props {
  onSelectNetwork: (network: EthereumChain) => () => void
  networkList: EthereumChain[]
  selectedNetwork: EthereumChain
  showNetworkDropDown: boolean
  onClick: () => void
}

const getShortNetworkName = (network: EthereumChain) => {
  for (let it of NetworkOptions) {
    if (it.id !== network.chainId) {
      continue
    }
    return it.abbr
  }
  return network.chainName
}

function SelectNetworkDropdown (props: Props) {
  const { selectedNetwork, networkList, onClick, onSelectNetwork, showNetworkDropDown } = props

  return (
    <StyledWrapper>
      <OvalButton onClick={onClick}>
        <OvalButtonText>{getShortNetworkName(selectedNetwork)}</OvalButtonText>
        <CaratDownIcon />
      </OvalButton>
      {showNetworkDropDown &&
        <DropDown>
          <SelectNetwork
            networks={networkList}
            onSelectNetwork={onSelectNetwork}
          />
        </DropDown>
      }
    </StyledWrapper >
  )
}

export default SelectNetworkDropdown
