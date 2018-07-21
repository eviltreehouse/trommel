'use strict';
const TrelloApi = require('../trello-api');
const TrommelConfig = require('./config');

const PromiseChain = require('../util/promise-chain');

/**
 * Constructs the foundation for an AGILE tracking Trello board
 * @param {string} board_id
 * @param {string} api_key
 * @param {string} api_token
 */
class TrommelBuilder {
    constructor(board_id, api_key, api_token) {
        this.board_id = board_id;
        this.api_key = api_key;
        this.api_token = api_token;

        this.tapi = new TrelloApi(this.board_id, this.api_key, this.api_token);
    }

    labelCache() {
        return this.tapi.label_cache;
    }

    listCache() {
        return this.tapi.list_cache;
    }

    buildLabels(skip_list) {
        var pc = new PromiseChain();

        // don't hammer Trello...
        pc.setThrottle(500);

        var self = this;
        var work = function(w, done) {
            self.tapi.createLabel(w.label[0], w.label[1]).then((resp) => {
                //console.log('createLabel SUCC', resp);
                done(label[0]);
            }, (err) => {
                console.error('createLabel FAIL', err);
                done(false);
            });
        }
        
        var to_skip = {};
        for (var i in skip_list) to_skip[ skip_list[i] ] = true;
        
        for (var i = 0; i < TrommelBuilder.LABELS.length; i++) {
            var label = TrommelBuilder.LABELS[i];
            if (! to_skip[ label[0] ]) pc.link(work, { label: label, id: label[0] });
        }

        return pc.run();
    }

    buildLists(skip_list) {
        var pc = new PromiseChain();

        // don't hammer Trello...
        pc.setThrottle(500);

        var self = this;
        var work = function(w, done) {
            self.tapi.createList(w.list).then((resp) => {
                done(w.list);
            }, (err) => {
                console.error('createList FAIL', err);
                done(false);
            });
        };

        var to_skip = {};
        for (var i in skip_list) to_skip[ skip_list[i] ] = true;        

        for (var i = 0; i < TrommelBuilder.LISTS.length; i++) {
            var list = TrommelBuilder.LISTS[i];
            if (! to_skip[list]) pc.link(work, { id: 'list_' + list, list: list });
        }

        return pc.run();
    }

    makeMetaCard() {
        var resolved_list = this.tapi.getList('Resolved');
        if (! resolved_list) return Promise.reject('no_resolved_list');

        var meta_card = {
            'idList': resolved_list.id,
            'name': '_meta',
            'desc': JSON.stringify( { 'next_id': 1 } )
        };

        var p = new Promise((resolve, reject) => {
            this.tapi.newCard(meta_card.name, meta_card.desc, meta_card.idList, null, null).then((card) => {
                //this.tapi.updateCard(card.id, null, null, null, true).then((resp) => {
                //    console.log(resp);

                    resolve(card.id);
                //}, reject);
            }, (err) => {
                reject(err);
            });
        });

        return p;
    }
}

/**
 * Helper for setting up a board for a loaded configuration.
 * @param {TrommelConfig} cnf
 * @return {TrommelBuilder}
 */
TrommelBuilder.WithConfig = function(cnf) {
    return new TrommelBuilder(cnf.boardId(), cnf.apiKey(), cnf.apiToken());
};

TrommelBuilder.LABELS = [
    [ 'bug', TrelloApi.LABEL_COLORS.RED ],
    [ 'feature', TrelloApi.LABEL_COLORS.GREEN ],
    [ 'debt', TrelloApi.LABEL_COLORS.BLUE ],
    [ 'next', TrelloApi.LABEL_COLORS.ORANGE ]
];

TrommelBuilder.LISTS =
    [ 'Todo', 'In Development', 'To Certify', 'Resolved' ]
;

module.exports = TrommelBuilder;