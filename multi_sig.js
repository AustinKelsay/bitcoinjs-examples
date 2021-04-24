const bitcoin = require('bitcoinjs-lib')
const {alice, bob, carol, dave} = require('./wallets.json')
const network = bitcoin.networks.regtest

console.log({alice, bob, carol, dave})

