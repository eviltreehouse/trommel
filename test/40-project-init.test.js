const assert = require('simple-assert');
const path = require('path');
const fs = require('fs');

const Trommel = require('../lib/trommel');
const TrelloApi = require('../lib/trello-api');


const PROJ_DIR = path.join(__dirname, 'fixtures', 'vfs');
const KEY_FILE = path.join(__dirname, 'fixtures', 'vfs', 'keys.json');
const DEF_FILE = path.join(__dirname, 'fixtures', 'vfs', '.trommel_id');

xdescribe("Trommel: Project INIT tests", () => {
    var BOARD_ID;

    before(function(done) {
       if (! process.env.TRELLO_API_KEY || ! process.env.TRELLO_API_TOKEN) {
           this.skip("Missing API credentials");
           return done();
       } else {
            makeTestBoard().then((new_id) => {
                BOARD_ID = new_id;
                    done();
            }, done);
       }
    });

    it("We can run the init process on our new board", function(done) {
        this.timeout(20000);

        if (! BOARD_ID) {
            this.skip("No Board ID");
            return done();
        }

        var trommel = Trommel(projectConfig(BOARD_ID));
        assert(trommel ? true : false);
        assert(trommel.config.valid, 'config is not valid');

        trommel.goInit().then(() => {
            done();
        }, done);
    });

    it("We can confirm our new entities exist", function(done) {
        this.timeout(10000);
        
        if (! BOARD_ID) {
            this.skip("No Board ID");
            return done();
        }

        var trommel = Trommel(projectConfig(BOARD_ID));
        assert(trommel ? true : false);
        assert(trommel.config.valid, 'config is not valid');

        trommel.trello().initCache().then((succ) => {
            try {
                var list = trommel.trello().getList('Todo');
                assert(list ? true : false);

                assert(list.name === 'Todo');

                var label = trommel.trello().getLabel('bug');
                assert(label ? true : false);
                assert(label.name === 'bug');

                done();
            } catch(e) {
                done(e);
            }
        }, done);
    });

    it("We can integrate our BoardManager", function(done) {
        this.timeout(8000);

        var trommel = Trommel(projectConfig(BOARD_ID));
        assert(trommel ? true : false);
        assert(trommel.config.valid, 'config is not valid');

        var bm = trommel.boardManager();
        assert(bm ? true : false);

        bm.init().then((succ) => {
            try {
                assert(typeof bm.todoList() === 'string');
                assert(typeof bm.inDevList() === 'string');
                assert(typeof bm.toCertifyList() === 'string');
                assert(typeof bm.resolvedList() === 'string');
                assert(typeof bm.metaCardId() === 'string');
                assert(bm.meta.next_id == 1);

                bm.nextCardId().then((id) => {
                    try {
                        assert(id == 1, 'id is ' + id);
                        assert(bm.meta.next_id == 2, 'next card id is ' + bm.meta.next_id);

                        done();
                    } catch(e) {
                        done(e);
                    }
                }, done);
            } catch(e) {
                done(e);
            }
        }, done);
    });

    after(function(done) {
        closeBoard(BOARD_ID).then(() => {
            clean();
            done();
        });
    });
});

function projectConfig(board_id) {
    return {
        'api-key': process.env.TRELLO_API_KEY,
        'api-token': process.env.TRELLO_API_TOKEN,
        'board-id': board_id,
        'quiet': true
    };
}

function makeTestBoard() {
    var tapi = new TrelloApi(null, process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
    assert(typeof tapi === 'object' && tapi != null);

    var board_name = 'init-test-' + Math.floor(Date.now() / 1000).toString();

    var p = new Promise((resolve, reject) => {
        tapi.newBoard(board_name, 'for testing. delete me.').then((resp) => {
            resolve(resp.board_id);
        }, reject);
    });

    return p;
}

function clean() {
    if (fs.existsSync(KEY_FILE)) fs.unlinkSync(KEY_FILE);
    if (fs.existsSync(DEF_FILE)) fs.unlinkSync(DEF_FILE);
}

function closeBoard(id) {
    if (! id) {
        console.log('no id');
        return Promise.resolve(true);
    }
    else {
        var p = new Promise((resolve, reject) => {
            var tapi = new TrelloApi(id, process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
            tapi.closeBoard().then(resolve, resolve); // not a lot we can do about what happens at this stage...
        });

        return p;
    }
}