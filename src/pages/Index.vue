<template>
<q-page class="justify-evenly">
  <div class="q-pa-md">
    <h4 class="text-center">Submit Raw Message</h4>
    <p>Open one email, find the more menu, view the raw message, then copy and paste the raw message into the below textarea</p>

    <q-input class="inputEmail" v-model="queryMailAddress" type="text" label="input email address here" > </q-input>
    <p>Balance: {{balance}} CKB</p>
        <q-btn class="q-mt-sm" label="Get Balance" @click="queryBalance" color="primary"/>
    <q-input
      class="q-pt-md submitContent"
      v-model="rawMessage"
      filled
      label="submit raw message of your mail"
      type="textarea">
      <template v-slot:append>
        <q-icon name="close" @click="rawMessage = ''" class="cursor-pointer"/>
      </template>
    </q-input>
    <q-btn class="q-mt-md btn-fixed-width" color="secondary" @click="sendTx" label="Submit" />
    <q-card class="dkim-card q-mt-md">
      <q-card-section>
        <p class="text-center">submitted simplified raw message</p>
        <span> From: {{ parsedMailIntent.from }} {{ parsedMailIntent.fromBalance }} CKB</span><br>
        <span> To: {{ parsedMailIntent.to }}</span><br>
        <span> Amount: {{ parsedMailIntent.amount }} CKB</span><br>

      </q-card-section>
    </q-card>
  </div>
</q-page>
</template>

<script lang="ts">
import { AmountUnit } from '@lay2/pw-core'
import { defineComponent, ref, watch } from '@vue/composition-api'
import { queryBalance as PWQueryBalance, parse, sendEmailAsset } from '../compositions/index'

interface MailIntent {
  from: string,
  fromBalance: string,
  to: string,
  amount: string
}

export default defineComponent({
  name: 'PageIndex',
  components: { },
  setup () {
    const balance = ref<string>('0.00')
    const queryMailAddress = ref<string>('')
    const rawMessage = ref<string>('')
    const parsedMailIntent = ref<MailIntent>({ from: '', fromBalance: '0.00', to: '', amount: '0.00' })

    const queryBalance = async () => {
      console.log('queryBalance', queryMailAddress.value)
      balance.value = await PWQueryBalance(queryMailAddress.value)
    }

    const sendTx = async () => {
      if (parsedMailIntent.value.to) {
        try {
          const txhash = await sendEmailAsset(rawMessage.value)
          console.log('send success', txhash)
        } catch (err) {
          console.error('send err', err)
        }
      } else {
        console.log('wrong email')
      }
    }

    watch(rawMessage, async () => {
      parsedMailIntent.value = { from: '', fromBalance: '0.00', to: '', amount: '0.00' }
      try {
        const { from, to, amount } = parse(rawMessage.value)
        const balance = await PWQueryBalance(from)
        parsedMailIntent.value = { from, fromBalance: balance, to, amount: amount.toString(AmountUnit.ckb) }
        console.log('mail', parsedMailIntent.value)
      } catch (err) { }
    })

    return { balance, queryBalance, parsedMailIntent, sendTx, queryMailAddress, rawMessage }
  }
})
</script>
