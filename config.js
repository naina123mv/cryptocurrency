const MINE_RATE = 1000;
const INITIAL_DIFFICULTY = 3;

const GENESIS_DATA = {
    timestamp: '03/06/2020',
    lastHash: '___',
    hash: 'hash',
    difficulty: INITIAL_DIFFICULTY,
    nonce: 0,
    data: []
};

module.exports = {GENESIS_DATA, MINE_RATE };