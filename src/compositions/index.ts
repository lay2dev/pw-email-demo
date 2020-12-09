import moment from 'moment'
import { simpleParser } from 'mailparser'

import PWCore, {
  Address,
  AddressType as PWAddressType,
  Amount,
  Script,
  AmountUnit
} from '@lay2/pw-core'

import { EmailCollector } from './email-collector'
import { EmailBuilder } from './email-builder'
import { EmailProvider, getEmailLock } from './email-provider'
import { EmailSigner } from './email-signer'
import * as chain from './chain'

export async function queryBalance (email: string): Promise<string> {
  const collector = new EmailCollector(chain.CELLAPI_URL)
  const lock = getEmailLock(email, 1)
  const amount = await collector.getBalance(lock.toAddress())

  console.log('amount', amount.toString(AmountUnit.ckb))
  return amount.toString(AmountUnit.ckb)
}
export interface MailIntent {
  from: string;
  to: string;
  toLock: Script;
  amount: Amount;
  timestamp: number;
}

export async function parse (mail: string): Promise<MailIntent> {
  const parsedMail = await simpleParser(mail)

  const subject = parsedMail.subject as string
  const date = parsedMail.date as Date
  const from = parsedMail.from?.value[0].address as string
  console.log('subject', subject)
  console.log('date', date)
  console.log('from', from)
  const timestamp = moment(date).unix()
  console.log('timestamp', timestamp)

  let [to, amountStr] = subject.split(',')
  to = to.trim()

  amountStr = amountStr
    .toLowerCase()
    .replace('ckb', '')
    .replace(',', '')
    .trim()

  let toLock: Script
  // let addressType = 'email'
  if (to.includes('@')) {
    // addressType = 'email'
    toLock = getEmailLock(to, timestamp)
  } else {
    // addressType = 'ckb'
    toLock = new Address(to, PWAddressType.ckb).toLockScript()
  }
  const amount = new Amount(amountStr, AmountUnit.ckb)
  console.log('toAddress', toLock.toAddress().addressString)
  console.log('toAmount', amount)

  return { from, to, toLock, amount, timestamp }
}

export async function sendEmailAsset (rawMessage: string): Promise<string> {
  const { from, toLock, amount, timestamp } = await parse(rawMessage)
  await queryBalance(from)

  const provider = new EmailProvider(rawMessage, from)
  const signature = await provider.sign('')
  const collector = new EmailCollector(chain.CELLAPI_URL)
  const pwcore = await new PWCore(chain.NODE_URL).init(provider, collector) //, 2, devChainConfig)

  console.log('sendEmailAsset.amount', amount)
  const builder = new EmailBuilder(
    toLock.toAddress(),
    amount,
    timestamp,
    1000,
    collector,
    signature
  )
  const signer = new EmailSigner(provider)

  const txhash = await pwcore.sendTransaction(builder, signer)
  return txhash
}
