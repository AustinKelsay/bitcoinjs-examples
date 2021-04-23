const bitcoin = require('bitcoinjs-lib');

// create basic P2PKH address
let testnet = bitcoin.networks.testnet;
let keyPair = bitcoin.ECPair.makeRandom({network: testnet});

const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
let pk = keyPair.toWIF();
console.log(address, pk);