const assert = require('assert');
const { describe, it } = require('mocha');
const { regtestUtils } = require('./_regtest');
const regtest = regtestUtils.network;
const bitcoin = require('bitcoinjs-lib')

describe('multisig test for legacy inputs and segqit native inputs', () => {

  it(
    'can create (and broadcast via 3PBP) a Transaction, w/ a ' +
    'P2SH(P2WSH(P2MS(3 of 4))) (SegWit multisig) input',
    async () => {
      const p2sh = createPayment('p2sh-p2wsh-p2ms(3 of 4)');
      const inputData = await getInputData(
        5e4,
        p2sh.payment,
        true,
        'p2sh-p2wsh',
        );
        {
          const {
            hash,
            index,
            witnessUtxo,
            redeemScript,
            witnessScript,
          } = inputData;
          assert.deepStrictEqual(
            { hash, index, witnessUtxo, redeemScript, witnessScript },
            inputData,
            );
          }
          
          const psbt = new bitcoin.Psbt({ network: regtest })
          .addInput(inputData)
          .addOutput({
            address: regtestUtils.RANDOM_ADDRESS,
            value: 2e4,
          })
          .signInput(0, p2sh.keys[0])
          .signInput(0, p2sh.keys[2])
          .signInput(0, p2sh.keys[3]);
          
          assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
          assert.strictEqual(
            psbt.validateSignaturesOfInput(0, p2sh.keys[3].publicKey),
            true,
            );
            assert.throws(() => {
              psbt.validateSignaturesOfInput(0, p2sh.keys[1].publicKey);
            }, new RegExp('No signatures for this pubkey'));
            psbt.finalizeAllInputs();
            
            const tx = psbt.extractTransaction();
            
            // build and broadcast to the Bitcoin RegTest network
            await regtestUtils.broadcast(tx.toHex());
            
            await regtestUtils.verify({
              txId: tx.getId(),
              address: regtestUtils.RANDOM_ADDRESS,
              vout: 0,
              value: 2e4,
            });
          },
          );
          
          it(
            'can create (and broadcast via 3PBP) a Transaction, w/ a ' +
            'P2SH(P2WSH(P2MS(3 of 4))) (SegWit multisig) input with nonWitnessUtxo',
            async () => {
              // For learning purposes, ignore this test.
              // REPEATING ABOVE BUT WITH nonWitnessUtxo by passing false to getInputData
              const p2sh = createPayment('p2sh-p2wsh-p2ms(3 of 4)');
              const inputData = await getInputData(
                5e4,
                p2sh.payment,
                false,
                'p2sh-p2wsh',
                );
                const psbt = new bitcoin.Psbt({ network: regtest })
                .addInput(inputData)
                .addOutput({
                  address: regtestUtils.RANDOM_ADDRESS,
                  value: 2e4,
                })
                .signInput(0, p2sh.keys[0])
                .signInput(0, p2sh.keys[2])
                .signInput(0, p2sh.keys[3]);
                psbt.finalizeAllInputs();
                const tx = psbt.extractTransaction();
                await regtestUtils.broadcast(tx.toHex());
                await regtestUtils.verify({
                  txId: tx.getId(),
                  address: regtestUtils.RANDOM_ADDRESS,
                  vout: 0,
                  value: 2e4,
                });
              },
              );
            })
              
function createPayment(_type: string, myKeys?: any[], network?: any): any {
    network = network || regtest;
    const splitType = _type.split('-').reverse();
    const isMultisig = splitType[0].slice(0, 4) === 'p2ms';
    const keys = myKeys || [];
    let m: number | undefined;
    if (isMultisig) {
    const match = splitType[0].match(/^p2ms\((\d+) of (\d+)\)$/);
    m = parseInt(match![1], 10);
    let n = parseInt(match![2], 10);
    if (keys.length > 0 && keys.length !== n) {
      throw new Error('Need n keys for multisig');
    }
    while (!myKeys && n > 1) {
      keys.push(bitcoin.ECPair.makeRandom({ network }));
      n--;
    }
  }
  if (!myKeys) keys.push(bitcoin.ECPair.makeRandom({ network }));

  let payment: any;
  splitType.forEach(type => {
    if (type.slice(0, 4) === 'p2ms') {
      payment = bitcoin.payments.p2ms({
        m,
        pubkeys: keys.map(key => key.publicKey).sort((a, b) => a.compare(b)),
        network,
      });
    } else if (['p2sh', 'p2wsh'].indexOf(type) > -1) {
      payment = (bitcoin.payments as any)[type]({
        redeem: payment,
        network,
      });
    } else {
      payment = (bitcoin.payments as any)[type]({
        pubkey: keys[0].publicKey,
        network,
      });
    }
  });

  return {
    payment,
    keys,
  };
}

function getWitnessUtxo(out: any): any {
  delete out.address;
  out.script = Buffer.from(out.script, 'hex');
  return out;
}

async function getInputData(
  amount: number,
  payment: any,
  isSegwit: boolean,
  redeemType: string,
): Promise<any> {
  const unspent = await regtestUtils.faucetComplex(payment.output, amount);
  const utx = await regtestUtils.fetch(unspent.txId);
  // for non segwit inputs, you must pass the full transaction buffer
  const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');
  // for segwit inputs, you only need the output script and value as an object.
  const witnessUtxo = getWitnessUtxo(utx.outs[unspent.vout]);
  const mixin = isSegwit ? { witnessUtxo } : { nonWitnessUtxo };
  const mixin2: any = {};
  switch (redeemType) {
    case 'p2sh':
      mixin2.redeemScript = payment.redeem.output;
      break;
    case 'p2wsh':
      mixin2.witnessScript = payment.redeem.output;
      break;
    case 'p2sh-p2wsh':
      mixin2.witnessScript = payment.redeem.redeem.output;
      mixin2.redeemScript = payment.redeem.output;
      break;
  }
  return {
    hash: unspent.txId,
    index: unspent.vout,
    ...mixin,
    ...mixin2,
  };
}