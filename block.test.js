const Block = require('./block')
const cryptoHash = require('./crypto-hash');
const {GENESIS_DATA} = require('./config');

describe('Block', () => {
    const timestamp = 'date';
    const lastHash = 'fhash';
    const hash = 'hash';
    const data = ['blockchain', 'data'];
    const block = new Block({timestamp, lastHash, hash, data});

    it('has a timestamp, lastHash, hash and data', () => {
        expect(block.timestamp).toEqual(timestamp);
        expect(block.lastHash).toEqual(lastHash);
        expect(block.hash).toEqual(hash);
        expect(block.data).toEqual(data);
    });

    describe('genesis()', () => {
        const genesisBlock = Block.genesis();
       
        it('returns a block', () => {
            expect(genesisBlock instanceof Block).toBe(true);
        });

        it('returns genesis data', () => {
            expect(genesisBlock).toEqual(GENESIS_DATA);
        });
    });

    describe('mineBlock()', () => {
        const lastBlock = Block.genesis();
        const data = 'data';
        const minedBlock = Block.mineBlock({lastBlock, data});
    

    it('returns block instance', () => {
        expect(minedBlock instanceof Block).toBe(true);
    });

    it('sets lasthash to be the hash of lastBlock', () => {
        expect(minedBlock.lastHash).toEqual(lastBlock.hash);
    }); 

    it('sets data', () => {
        expect(minedBlock.data).toEqual(data);
    });
    
    it('sets timestamp', () => {
        expect(minedBlock.timestamp).not.toEqual(undefined);
    });

    it('creates a SHA-256 hash based on proper inputs', () => {
        expect(minedBlock.hash)
        .toEqual(cryptoHash(minedBlock.timestamp, lastBlock.hash, data));
    });
});
});