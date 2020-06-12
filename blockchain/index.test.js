const Blockchain = require('./index');
const Block = require('./block');
const { cryptoHash } = require('../util');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');


describe('Blockchain', () => {
    let blockchain, newchain, originalChain, errorMock;

    beforeEach(() => {
        blockchain = new Blockchain();
        newchain = new Blockchain();
        errorMock = jest.fn();
        
        originalChain = blockchain.chain;
        global.console.error = errorMock;
    });

    it('contains a chain of Array instance', () => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });

    it('starts with the genesis block', () => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });

    it('adds a new block to chain', () => {
        const newData = 'foo_bar';
        blockchain.addBlock({data: newData});

        expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
    });

    describe('isValidChain()', () => {
        describe('when the chain does not start with the genesis block', () => {
            it('returns false', () => {
                blockchain.chain[0] = {data: 'fake-genesis'};

                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });

        describe('when the chain starts with genesis block and has multiple blocks', () => {
            beforeEach(() => {
                blockchain.addBlock({data: 'Bears'});
                blockchain.addBlock({data: 'Beets'});
                blockchain.addBlock({data: 'Bars'});
            });
            
            describe('and a lasthash reference has changed', () => {
                it('returns false', () => {
                    blockchain.chain[2].lastHash = 'broken-lastHash';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain contains a block with invalid field', () => {
                it('returns false', () => {
                    blockchain.chain[2].data = 'bad data';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });                    
            });

            describe('and the chain contains a block with a jumped difficulty', () => {
                it('returns false', () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length - 1];
                    const lastHash = lastBlock.hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;
                    const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);

                    const badBlock = new Block({
                        timestamp, lastHash, hash, difficulty, nonce, data
                    });

                    blockchain.chain.push(badBlock);

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain does not contain any invalid blocks', () => {
                it('returns false', () => {

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });  
            });
        });
    });

    describe('repalceChain()', () => {

        let logMock;
        beforeEach(() => {
            logMock = jest.fn();

            global.console.log = logMock;
        });
        describe('when the chain is not longer', () => {

            beforeEach(() => {
                newchain.chain[0] = {new: 'chain'};
                blockchain.replaceChain(newchain.chain);
            });

            it('does not replace the chain', () => {                
                expect(blockchain.chain).toEqual(originalChain);
            });

            it('logs an error', () => {
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('when the chain is longer', () => {
            beforeEach(() => {
                newchain.addBlock({data: 'Bears'});
                newchain.addBlock({data: 'Beets'});
                newchain.addBlock({data: 'Bars'});
            });
            describe('and the chain is invalid', () => {

                beforeEach(() => {
                    newchain.chain[2].hash = 'fake-hash';
                    blockchain.replaceChain(newchain.chain);
                });
                it('does not replace the chain', () => {                    
                    expect(blockchain.chain).toEqual(originalChain);
                });

                it('logs an error', () => {
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the chain is valid', () => {
                beforeEach(() => {
                    blockchain.replaceChain(newchain.chain);
                });
                
                it('replaces the chain', () => {                   
                    expect(blockchain.chain).toEqual(newchain.chain);
                });

                it('logs about the chain replacement', () => {
                    expect(logMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the `validTransactions` flag is true', () => {
            it('calls validTransactionData()', () => {
                const validTransactionDataMock = jest.fn();

                blockchain.validTransactionData = validTransactionDataMock;

                newchain.addBlock({ data : 'foo'});
                blockchain.replaceChain(newchain.chain, true);

                expect(validTransactionDataMock).toHaveBeenCalled();
            });
        });
    });

    describe('validTransactionData()', () => {
        let transaction, rewardTransaction, wallet;

        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.createTransaction({ recipient : 'foo-add', amount : 65});
            rewardTransaction = Transaction.rewardTransaction({ minerWallet : wallet});
        });

        describe('and the transaction data is valid', () => {
            it('returns true', () => {
                newchain.addBlock({ data : [transaction, rewardTransaction]});

                expect(blockchain.validTransactionData({chain: newchain.chain})).toBe(true);
                expect(errorMock).not.toHaveBeenCalled();
            });
        });

        describe('and the transaction data has multiple rewards', () => {
            it('returns false and logs an error', () => {
                newchain.addBlock({ data : [transaction, rewardTransaction, rewardTransaction]});

                expect(blockchain.validTransactionData({chain: newchain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and the transaction data has at least one malformed outputMap', () => {
            describe('and the transaction is not a reward transaction', () => {
                it('returns false and logs an error', () => {
                    transaction.outputMap[wallet.publicKey] = 999999;

                    newchain.addBlock({ data : [transaction, rewardTransaction]});

                    expect(blockchain.validTransactionData({chain: newchain.chain})).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the transaction is a reward transaction', () => {
                it('returns false and logs an error', () => {
                    rewardTransaction.outputMap[wallet.publicKey] = 999999;

                    newchain.addBlock({ data: [transaction, rewardTransaction]});

                    expect(blockchain.validTransactionData({chain : newchain.chain})).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the transaction data has at least one malformed input', () => {
            it('returns false and logs an error', () => {
                wallet.balance = 9000;

                const evilOutputMap = {
                    [wallet.publicKey] : 8900,
                    fooRecipient : 100
                };

                const evilTransaction = {
                    input : {
                        timestamp : Date.now(),
                        amount : wallet.balance,
                        address : wallet.publicKey,
                        signature : wallet.sign(evilOutputMap)
                    },
                    outputMap : evilOutputMap
                }

                newchain.addBlock({ data: [evilTransaction, rewardTransaction]});
                expect(blockchain.validTransactionData({chain : newchain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();

            });
        });

        describe('and a block contains multiple identical transactions', () => {
            it('returns false and logs an error', () => {
                newchain.addBlock(
                    { data: [transaction, transaction, transaction, rewardTransaction]}
                    );
                expect(blockchain.validTransactionData({chain : newchain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

    });
});