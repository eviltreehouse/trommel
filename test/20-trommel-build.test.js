const assert = require('simple-assert');
const TrelloApi = require('../lib/trello-api');

const TrommelBuilder = require('../lib/trommel/builder');

xdescribe("Trommel Builder Tests", () => {
    var BOARD_ID;
    before(function(done) {
        if (! process.env.TRELLO_API_KEY || ! process.env.TRELLO_API_TOKEN) {
            this.skip("Missing Trello test parameters");
        } else {
            try {
                var board_name = Math.floor(Date.now() / 1000).toString() + " builder test";

                var api = new TrelloApi(null, process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
                api.newBoard(board_name, "testing builder").then((resp) => {
                    BOARD_ID = api.board_id;
                    done();
                }, done);
            } catch(e) {
                done(e);
            }
        }
    });

    after(function(done) {
        this.timeout(5000);
        if (BOARD_ID) {
            try {
                // close our test board...
                var api = new TrelloApi(BOARD_ID, process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
                api.closeBoard().then((n_api) => { done(); }, done);
            } catch(e) {
                done(e);
            }
        } else done();
    });

    it("Builder: Labels", function(done) {
        this.timeout(10000);
        if (! BOARD_ID) {
            this.skip("No board_id");
            done();
            return;
        }

        try {
            var tb = new TrommelBuilder(BOARD_ID, process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
            assert(tb);

            tb.buildLabels().then((pc) => {
                //console.log('buildLabels results', pc.chainResults());
                try {
                    assert(pc.chainResults());
                    assert(tb.labelCache().length == TrommelBuilder.LABELS.length, 'labelcache is ' + tb.labelCache().length);

                    done();
                } catch(e) {
                    done(e);
                }
            }, (pc) => {
                //console.log('failed on', pc.abortedId());
                done('createLabel#' + pc.abortedId());
            });
        } catch(e) {
            done(e);
        }
    });

    it("Builder: Lists", function(done) {
        this.timeout(10000);
        if (! BOARD_ID) {
            this.skip('no board_id');
            return done();
        }

        try {
            var tb = new TrommelBuilder(BOARD_ID, process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
            assert(tb);

            tb.buildLists().then((pc) => {
                try {
                    assert(pc.chainResults());
                    assert(tb.listCache().length == TrommelBuilder.LISTS.length, 'listcache is ' + tb.listCache().length);

                    done();
                } catch(e) {
                    done(e);
                }
            }, (pc) => {
                done('createList#' + pc.abortedId())
            });
        } catch(e) {
            done(e);
        }
    });
});