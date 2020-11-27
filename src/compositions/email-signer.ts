import { Signer, Message, Blake2bHasher } from '@lay2/pw-core'
import { EmailProvider } from './email-provider'

export class EmailSigner extends Signer {
  constructor (readonly provider: EmailProvider) {
    super(new Blake2bHasher())
  }

  async signMessages (messages: Message[]): Promise<string[]> {
    const sigs = messages.map(x => '0x')
    // const sigs = ['']
    sigs[0] = await this.provider.sign(messages[0].message)
    // sigs[1] = await this.provider.sign(messages[0].message)
    return sigs
  }
}
