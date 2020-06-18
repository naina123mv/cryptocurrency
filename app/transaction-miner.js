const Transaction = require('../wallet/transaction');

class TransactionMiner {

    constructor({ blockchain, transactionPool, wallet, pubsub }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }

    mineTransactions() {
        //get valid transactions from the pool
        const validTransactions = this.transactionPool.validTransactions();
        if(validTransactions.length === 0) {
            console.log("Empty pool");
            this.transactionPool.clear();
            return;
        }

        let totalTransactionCount = 0;
        for(let transaction of validTransactions) {
            totalTransactionCount += transaction.count;
        }
        //generate miner reward
        validTransactions.push(
            Transaction.rewardTransaction({ minerWallet : this.wallet, totalTransactionCount})
        );

        //add blk with these to blkchain
        this.blockchain.addBlock({ data : validTransactions });

        
        //broadcast the updated chain
        this.pubsub.broadcastChain();

        //clear the transaction pool
        this.transactionPool.clear();
    }
}

module.exports = TransactionMiner;