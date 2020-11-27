import { Provider, Platform, Script, HashType } from '@lay2/pw-core'
import { scriptToHash, toUint32Le, JSBI } from '@nervosnetwork/ckb-sdk-utils'
import blake160 from '@nervosnetwork/ckb-sdk-utils/lib/crypto/blake160'
import * as chain from './chain'

export function getEmailLock (email: string, timestamp: number) {
  const hash = blake160(Buffer.from(email), 'hex')
  const timestampHex = '0x' + JSBI.BigInt(timestamp).toString(16)
  console.log('timestampHex', timestampHex)
  const str = toUint32Le(timestampHex)

  const args = `0x${hash}${str.replace('0x', '')}`
  //   83f0dad204db71d0849988295bb82dcc99797d05fc0abe5f

  const codeHash = scriptToHash(chain.pwidDeps.type as Script)
  // console.log('codeHash', codeHash)
  const lock = new Script(codeHash, args, HashType.type)
  return lock
}

export class EmailProvider extends Provider {
  constructor (private readonly rawMessage: string, private readonly emailAddress: string) {
    super(Platform.ckb)

    this.address = getEmailLock(emailAddress, 1).toAddress()
  }

  async init (): Promise<Provider> {
    return this
  }

  async sign (message: string): Promise<string> {
    const sig = '0x' + Buffer.from(this.rawMessage).toString('hex')
    // console.log('sig', sig)
    return sig
    // return ''
  }

  async close () {
    console.log('do nothing')
  }
}
