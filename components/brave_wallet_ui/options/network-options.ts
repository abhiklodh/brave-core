import { NetworkOptionsType } from '../constants/types'
import locale from '../constants/locale'

export const NetworkOptions: NetworkOptionsType[] = [
  {
    id: '0x1',
    name: `${locale.networkETH} ${locale.networkMain}`,
    abbr: locale.networkMain
  },
  {
    id: '0x4',
    name: `${locale.networkRinkeby} ${locale.networkTest}`,
    abbr: locale.networkRinkeby
  },
  {
    id: '0x3',
    name: `${locale.networkRopsten} ${locale.networkTest}`,
    abbr: locale.networkRopsten
  },
  {
    id: '0x5',
    name: `${locale.networkGoerli} ${locale.networkTest}`,
    abbr: locale.networkGoerli
  },
  {
    id: '0x2a',
    name: `${locale.networkKovan} ${locale.networkTest}`,
    abbr: locale.networkKovan
  },
  {
    id: 'localhost',
    name: locale.networkLocalhost,
    abbr: locale.networkLocalhost
  }
]
