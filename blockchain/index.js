const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const { cryptoHash } = require('../util');
const {REWARD_INPUT, MINING_REWARD} = require('../config');

class Blockchain{

    constructor() {
        this.chain = [Block.genesis()];
    }

    addBlock({data}) {
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1], 
            data});

        this.chain.push(newBlock);
    }

    validTransactionData({ chain }) {
        for(let i=1;i<chain.length; i++){
            const block = chain[i];
            const transactionSet = new Set();   
            let rewardsTransactionCount = 0;
            
            let totalTransactionCount = -1; //since reward transaction has a count of 1, that does not need to be counted
            for(let transaction of block.data) {
                totalTransactionCount += transaction.count;
            }

            for(let transaction of block.data) {
                if(transaction.input.address === REWARD_INPUT.address) {
                    rewardsTransactionCount += 1;

                    if(rewardsTransactionCount >1) {
                        console.error('Miner reward exceed limit');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== (MINING_REWARD + 2*totalTransactionCount)) {
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                } else {
                    if(!Transaction.validTransaction(transaction)) {
                        console.error('Invalid Transaction');
                        return false;
                    }

                    // const trueBalance = Wallet.calculateBalance({
                    //     chain : this.chain,
                    //     address : transaction.input.address
                    // });

                    // if(transaction.input.amount !== trueBalance) {
                    //     console.error('Invalid input amount');
                    //     return false;
                    // }

                    if(transactionSet.has(transaction)) {
                        console.error('An identical transaction appears more than once in the block');
                        return false;
                    } else {
                        transactionSet.add(transaction);
                    }
                }
            }
        }
        return true;
    }

    static isValidChain(chain) {
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
            return false;
        
        for(let i=1; i<chain.length;i++) {
            const {timestamp, lastHash, hash, nonce, difficulty, data} = chain[i];
            const actualLastHash = chain[i-1].hash;
            const lastDifficulty = chain[i-1].difficulty;
            if(lastHash !== actualLastHash) 
                return false;
            
            const validatedhash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
            if(hash !== validatedhash)
                return false;

            if(Math.abs(lastDifficulty -difficulty) > 1)
                return false;
        }
        return true;
    }
    
    replaceChain(chain, validateTransactions, onSuccess) {
        if(chain.length <= this.chain.length) {
            console.error('The incoming chain must be longer');
            return;
        }

        if(!Blockchain.isValidChain(chain)) {
            console.error('The incoming chain must be valid');
            return;
        }

        if(validateTransactions && !this.validTransactionData({chain})) {
            console.error('The incoming chain has invalid data');
            return;
        }

        if (onSuccess) onSuccess();
        
        console.log('replacing chain with ', chain);
        this.chain = chain;
            
    }
}

module.exports = Blockchain;