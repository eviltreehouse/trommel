'use strict';

const TrelloApi = require('../trello-api');

class TrommelBoard {
    constructor(board_id, trello_api) {
        this.board_id = board_id;

        /** @type {TrelloApi} */
        this.tapi = trello_api;

        this.list_ids = {};
        this.meta = {};

        this.meta_card_id = null;
    }

    nextCardId() {
        var id;

        var p = new Promise((resolve, reject) => {
            this.refreshMeta().then(() => {
                id = this.meta.next_id++;

                if (id > 0) {
                    this.updateMeta().then(() => {
                        resolve(id);
                    }, reject);
                } else {
                    return Promise.reject('get_id_fail');
                }
            }, reject);
        });

        return p;
    }

    metaCardId() {
        return this.meta_card_id;
    }

    todoList() {
        return this.list_ids['Todo'];
    }

    inDevList() {
        return this.list_ids['In Development'];
    }

    toCertifyList() {
        return this.list_ids['To Certify'];
    }

    resolvedList() {
        return this.list_ids['Resolved'];
    }

    refreshMeta() {
        if (! this.meta_card_id) return Promise.reject('no_meta_id');

        var p = new Promise((resolve, reject) => {
            this.tapi.loadCardBasic(this.meta_card_id).then((card) => {
                this.meta = JSON.parse(card.desc);
                resolve(card);
            }, reject);    
        });

        return p;
    }

    updateMeta() {
        if (! this.meta_card_id) return Promise.reject('no_meta_id');

        var p = new Promise((resolve, reject) => {
            this.tapi.updateCard(this.meta_card_id, null, JSON.stringify(this.meta), null, null).then((resp) => {
                resolve(resp);
            }, reject);
        });

        return p;
    }

    init() {
        var p = new Promise((resolve, reject) => {
            this.tapi.initCache().then(() => {
                ['Todo', 'In Development', 'To Certify', 'Resolved'].forEach((n) => {
                    var l = this.tapi.getList(n);
                    if (l) this.list_ids[n] = l.id;
                });

                if (! this.resolvedList()) {
                    reject('no_resolved_list_id');
                    return;
                }

                this.tapi.getListCards(this.resolvedList()).then((resp) => {                    
                    for (var i in resp) {
                        if (resp[i].name == '_meta') {
                            this.meta_card_id = resp[i].id;
                            break;
                        }
                    }

                    if (this.meta_card_id) {
                        this.refreshMeta().then(() => {
                            resolve(true);
                        }, reject);
                    } else reject('no_meta_card');
                }, reject);
            }, reject);
        });

        return p;
    }
}

module.exports = TrommelBoard;