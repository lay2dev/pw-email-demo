import PWCore, {
  Address,
  Amount,
  AmountUnit,
  Builder,
  Cell,
  CellDep,
  Collector,
  DepType,
  OutPoint,
  RawTransaction,
  Transaction
} from '@lay2/pw-core'

import * as chain from './chain'

export class EmailBuilder extends Builder {
  constructor (
    private address: Address,
    private amount: Amount,
    feeRate?: number,
    collector?: Collector,
    private signature?: string
  ) {
    super(feeRate, collector)
  }

  async build (fee: Amount = Amount.ZERO): Promise<Transaction> {
    const outputCell = new Cell(this.amount, this.address.toLockScript())
    const neededAmount = this.amount.add(Builder.MIN_CHANGE).add(fee)
    let inputSum = new Amount('0')
    const inputCells: Cell[] = []

    // fill the inputs
    const maxAmount = new Amount('90000000000', AmountUnit.ckb)
    const cells = await this.collector.collect(PWCore.provider.address, { neededAmount: maxAmount })
    for (const cell of cells) {
      inputCells.push(cell)
      inputSum = inputSum.add(cell.capacity)
      // if (inputSum.gt(neededAmount)) break
    }

    if (inputSum.lt(neededAmount)) {
      throw new Error(
        `input capacity not enough, need ${neededAmount.toString(AmountUnit.ckb)}, got ${inputSum.toString(
          AmountUnit.ckb
        )}`
      )
    }

    const changeLock = PWCore.provider.address.toLockScript()
    changeLock.args = changeLock.args.substr(0, 42) + this.address.toLockScript().args.substr(42)
    const changeCell = new Cell(inputSum.sub(outputCell.capacity), changeLock)

    // console.log('chain', chain.rsaDeps);
    const rsa = chain.rsaDeps.outPoint
    const emailOutpoint = chain.pwidDeps.outPoint

    const rsaDep = new CellDep(DepType.code, new OutPoint(rsa.txHash, rsa.index))
    const emailDep = new CellDep(DepType.code, new OutPoint(emailOutpoint.txHash, emailOutpoint.index))

    // console.log('output.amount', outputCell.capacity)
    // console.log('inputCells', JSON.stringify({ inputCells, outputCell, changeCell }))

    const tx = new Transaction(new RawTransaction(inputCells, [outputCell, changeCell], [rsaDep, emailDep]), [
      // Builder.WITNESS_ARGS.Secp256k1,
      {
        lock: this.signature as string,
        input_type: '',
        output_type: ''
      }
    ])

    // this.fee = Builder.calcFee(tx, this.feeRate)
    this.fee = new Amount('1', AmountUnit.ckb)
    if (changeCell.capacity.gte(Builder.MIN_CHANGE.add(this.fee))) {
      changeCell.capacity = changeCell.capacity.sub(this.fee)
      tx.raw.outputs.pop()
      tx.raw.outputs.push(changeCell)

      return tx
    }
    return this.build(this.fee)
  }

  getCollector () {
    return this.collector
  }
}
