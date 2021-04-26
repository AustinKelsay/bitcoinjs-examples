const bitcoin = require('bitcoinjs-lib')
const {alice, bob, carol, dave} = require('./wallets.json')
const network = bitcoin.networks.regtest

const keyPairAlice0 = bitcoin.ECPair.fromWIF(alice[0].wif, network)
const keyPairBob0 = bitcoin.ECPair.fromWIF(bob[0].wif, network)
const keyPairCarol0 = bitcoin.ECPair.fromWIF(carol[0].wif, network)
const keyPairDave0 = bitcoin.ECPair.fromWIF(dave[0].wif, network)
  
const keyPairAlice1 = bitcoin.ECPair.fromWIF(alice[1].wif, network)
const p2wpkhAlice1 = bitcoin.payments.p2wpkh({pubkey: keyPairAlice1.publicKey, network})

const p2ms = bitcoin.payments.p2ms({
    m: 2, pubkeys: [
      keyPairAlice0.publicKey,
      keyPairBob0.publicKey,
      keyPairCarol0.publicKey,
      keyPairDave0.publicKey], network})

const p2wsh = bitcoin.payments.p2wsh({redeem: p2ms, network})
  
// Prepare spending transaction
// Create a BitcoinJS transaction builder object.

const txb = new bitcoin.TransactionBuilder(network)

// Create the input by referencing the outpoint of our P2SH funding transaction.
// Create the output that will send the funds to Alice_1 P2WPKH address, leaving 100 000 satoshis as mining fees.

txb.addInput('TX_ID', TX_VOUT)
txb.addOutput(p2wpkhAlice1.address, 999e5)

// Alice_0 and Bob_0 now sign the transaction. Note that, 
// because we are doing a P2WSH, we need to provide the locking script as witnessScript sixth parameter of the sign method, as well as the input value.
// txb.sign(index, keyPair, redeemScript, sign.hashType, value, witnessScript)
txb.sign(0, keyPairAlice0, null, null, 1e8, p2wsh.redeem.output)
txb.sign(0, keyPairBob0, null, null, 1e8, p2wsh.redeem.output)

// Build the transaction and get the raw hex serialization.
const tx = txb.build()
console.log('tx.toHex()  ', tx.toHex())