<template>
<q-page class="justify-evenly">
  <div class="q-pa-md">
    <h4 class="text-center">Submit Raw Email</h4>

    <q-input class="inputEmail" v-model="queryMailAddress" type="text" label="input email address here" > </q-input>
    <p>Balance: <b>{{balance}}</b> CKB - <a href="https://facuet.nervos.org" >Get More From Faucet</a></p>
    <p style="word-break: break-all">Address: <b>{{address}}</b> <span class="text-primary" v-if="address!=='-'"> - Updating in {{countdown}}s</span></p>
    <div class="q-gutter-sm">
      <q-btn class="q-mt-sm" label="Get Balance" @click="queryBalance" color="primary"/>
      <q-btn class="q-mt-sm" label="Generate Address" @click="generateAddress" color="primary"/>
    </div>
    <q-input
      class="q-pt-md submitContent"
      v-model.trim="rawMessage"
      filled
      label="submit raw message of your mail"
      type="textarea">
      <template v-slot:append>
        <q-icon name="close" @click="rawMessage = ''" class="cursor-pointer"/>
      </template>
    </q-input>
    <q-btn class="q-my-md btn-fixed-width" color="secondary" @click="sendTx" label="Submit" />
    <q-card class="my-card">
      <q-card-section v-if="txhash.length">
        <a :href="link"> {{ txhash }} </a>
      </q-card-section>
    </q-card>
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
import { computed, defineComponent, onUnmounted, ref, watch } from '@vue/composition-api'
import { getEmailLock } from 'src/compositions/email-provider'
import { queryBalance as PWQueryBalance, parse, sendEmailAsset } from '../compositions/index'

export const EXPLORER_URL = 'https://explorer.nervos.org/aggron'

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
    const balance = ref('0.00')
    const address = ref('-')
    const queryMailAddress = ref('')
    const rawMessage = ref('')
    const parsedMailIntent = ref<MailIntent>({ from: '', fromBalance: '0.00', to: '', amount: '0.00' })
    const countdown = ref(5)
    const txhash = ref('')
    const link = computed(() => {
      return `${EXPLORER_URL}/transaction/${txhash.value}`
    })
    const timer = setInterval(() => {
      if (countdown.value-- <= 1 && address.value !== '-') {
        generateAddress()
        countdown.value = 5
      }
    }, 1000)

    onUnmounted(() => {
      clearInterval(timer)
    })

    const queryBalance = async () => {
      console.log('queryBalance', queryMailAddress.value)
      balance.value = await PWQueryBalance(queryMailAddress.value)
    }

    const generateAddress = () => {
      address.value = getEmailLock(queryMailAddress.value, (Math.floor(new Date().getTime() / 1000))).toAddress().toCKBAddress()
    }

    const sendTx = async () => {
      if (parsedMailIntent.value.to) {
        try {
          txhash.value = await sendEmailAsset(rawMessage.value)
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
        const { from, to, amount } = await parse(rawMessage.value)
        const balance = await PWQueryBalance(from)
        parsedMailIntent.value = { from, fromBalance: balance, to, amount: amount.toString(AmountUnit.ckb) }
        console.log('mail', parsedMailIntent.value)
      } catch (err) { }
    })

    return { address, countdown, balance, queryBalance, parsedMailIntent, sendTx, queryMailAddress, rawMessage, generateAddress, link, txhash }
  }
})
</script>
