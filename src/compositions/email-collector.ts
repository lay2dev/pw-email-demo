import { Address, Amount, AmountUnit, Cell, Collector, CollectorOptions, OutPoint, Script } from '@lay2/pw-core'
import axios from 'axios'

export class EmailCollector extends Collector {
  constructor (public apiBase: string) {
    super()
    this.apiBase = apiBase
  }

  async getBalance (address: Address): Promise<Amount> {
    const lock = address.toLockScript()
    const { codeHash, hashType } = lock
    let { args } = lock
    args = args.substring(0, 42)

    const data = {
      lock: {
        codeHash,
        args,
        hashType,
        isPrefix: true
      }
    }
    const res = await axios.post(`${this.apiBase}/cell/getCapacityByLock`, data)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return new Amount(res.data.data, AmountUnit.shannon)
  }

  async collect (address: Address, options?: CollectorOptions): Promise<Cell[]> {
    const cells: Cell[] = []
    const lock = address.toLockScript()

    const { codeHash, hashType } = lock
    let { args } = lock
    args = args.substring(0, 42)

    const data = {
      capacity: options?.neededAmount?.toHexString(),
      lock: {
        codeHash,
        args,
        hashType,
        isPrefix: true
      }
    }
    const res = await axios.post(`${this.apiBase}/cell/unSpent`, data)

    // eslint-disable-next-line prefer-const
    for (let {
      capacity,
      outPoint,
      lock: { codeHash, hashType, args }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } of res.data.data) {
      capacity = new Amount(capacity, AmountUnit.shannon)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      outPoint = new OutPoint(outPoint.txHash, outPoint.index)

      const lockScript = new Script(codeHash, args, hashType)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const timestamp = args.substr(42)

      // console.log('input timestamp', id, timestamp)

      cells.push(new Cell(capacity, lockScript, undefined, outPoint))
    }
    return cells
  }
}
