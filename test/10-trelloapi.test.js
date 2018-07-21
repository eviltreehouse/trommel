const assert = require('simple-assert');
const fs = require('fs');
const path = require('path');

const TrelloApi = require('../lib/trello-api');

xdescribe("Trello API Tests", () => {
    /** @type {TrelloApi} */    
    var api;

    var API_KEY;
    var API_TOKEN;
    var BOARD_ID;
    var CARD_ID;

    before(function() {
        if (! process.env.TRELLO_API_KEY || ! process.env.TRELLO_API_TOKEN) {
            this.skip("Missing Trello test parameters");
        } else {
            API_KEY = process.env.TRELLO_API_KEY;
            API_TOKEN = process.env.TRELLO_API_TOKEN;
        }

        api = new TrelloApi(null, API_KEY, API_TOKEN);
    });

    it("Test board CREATE", (done) => {
        var board_name = 'test-' + Math.floor(Date.now() / 1000).toString();

        try {
            api.newBoard(board_name, 'unit test board').then((n_api) => {
                assert(typeof n_api === 'object');
                assert(typeof n_api.board_id === 'string');

                BOARD_ID = n_api.board_id;
                done();
            }, done);
        } catch(e) { done(e); }
    });

    it("Test initial cache fetch", function(done) {
        if (! BOARD_ID)this.skip("No test board ID");

        try {
            api.initCache().then((res) => {
                assert(api.list_cache.length == 0);
                assert(api.label_cache.length == 0);

                done();
            }, done);
        } catch(e) {
            done(e);
        }
    });

    it("Create a label", function(done) {
        try {
            api.createLabel("demo", TrelloApi.LABEL_COLORS.SKY).then((resp) => {
                assert(resp.id);
                assert(resp.name === 'demo');

                assert(api.label_cache.length === 1);
                done();
            }, done);
        } catch(e) {
            done(e);
        }
    });

    it("Create a list", function(done) {
        try {
            api.createList("demo").then((resp) => {
                assert(resp.id);
                assert(resp.name === 'demo');

                assert(api.list_cache.length === 1);
                done();
            });
        } catch(e) {
            done(e);
        }
    });

    it("Create a demo card", function(done) {
        var list = api.getList('demo');
        assert(typeof list === 'object' && list !== null);

        var label = api.getLabel('demo');
        assert(typeof label === 'object' && label !== null);

        try {
            api.newCard("demo card", "testing test testing", list.id, null, [ label.id] ).then((resp) => {
                assert(resp.id);
                assert(resp.name === 'demo card');

                CARD_ID = resp.id;

                done();
            }, done);
        } catch(e) {
            done(e);
        }
    });

    it("Upload a URL to our demo card", function(done) {
        try {
            api.addLinkToCard(CARD_ID, 'demo URL', 'https://trello.com').then((resp) => {
                assert(resp.id);
                assert(resp.name === 'demo URL');

                done();
            }, done);
        } catch(e) {
            done(e);
        }
    });

    it("Upload a GIF to our demo card (and set it as our cover)", function(done) {
        this.timeout(8000); // this might take longer

        var gif_path = path.resolve(__dirname, 'fixtures', 'omfg-onoz.gif');
        if (! fs.existsSync(gif_path)) {
            done(gif_path + " does not exist!");
            return;
        }

        try {
            api.uploadAsCover(CARD_ID, gif_path).then((resp) => {
                assert(resp);
                done();
            }, done);
        } catch(e) {
            done(e);
        }
    });

    it("Test board CLOSE", function(done) {
        if (! BOARD_ID) this.skip("No test board ID");

        api.closeBoard().then((n_api) => {
            assert(typeof n_api === 'object');
            assert(n_api.board_id === null);

            done();
        }, done);
    });
});