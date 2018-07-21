const assert = require('simple-assert');

describe("Baseline Tests", () => {
    it("Asserts work", () => {
        assert(true);
    });

    it("Our base classes are parse-error free", () => {
        assert(require('../lib/trommel'), 'trommel.js has errors');
        assert(require('../lib/trello-api'), 'trello-api has errors');
    });
});