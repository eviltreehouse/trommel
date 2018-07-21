'use strict';

const Trello = require('node-trello');
const fs = require('fs');

const LABEL_COLORS = {
    'YELLOW': 'yellow', 
    'PURPLE': 'purple', 
    'BLUE': 'blue', 
    'RED': 'red', 
    'GREEN': 'green',
    'LIME': 'lime',
    'ORANGE': 'orange', 
    'BLACK': 'black', 
    'SKY': 'sky', 
    'PINK': 'pink' 
};

/**
 * Wrap `node-trello` raw request methods w/ domain methods
 */

class TrelloApi {
    constructor(board_id, api_key, api_token) {
        this.board_id = board_id;
        this.api_key = api_key;
        this.api_token = api_token;
        
        this.cache_loaded = false;
        this.list_cache = [];
        this.label_cache = [];

        this.trello = new Trello(api_key, api_token);
    }

    initCache(recache) {
        // pre-cache our lists and labels
        recache = recache === true ? true : false;

        // don't recache if we don't explicitly need to
        if (this.cache_loaded && !recache) return Promise.resolve(true);

        var p = new Promise((resolve, reject) => {
            this.getLabels()
                .then(() => {
                    this.getLists().then(() => {
                        this.cache_loaded = true;
                        resolve(true);
                    }, (err) => { reject(err); })
                    ;
                }, (err) => { reject(err); })
            ;
        });

        return p;
    }

    newBoard(name, desc) {
        var board = { 'name': name, 'defaultLists': false, 'defaultLabels': false, 'desc': desc };
        var p = new Promise((resolve, reject) => {
            this.trello.post('/1/boards', board, (err, resp) => {
                if (err) reject(err);
                else resolve(resp.id);
            });
        });


        return p.then((new_id) => {
            this.board_id = new_id;
            return Promise.resolve(this);
            }, (err) => { return Promise.reject(err); }
        );
    }

    closeBoard() {
        if (! this.board_id) return Promise.reject('no_board_id');
        var p = new Promise((resolve, reject) => {
            this.trello.put(`/1/boards/${this.board_id}`, { closed: true }, (err, resp) => {
                if (err) reject(err);
                else {
                    this.board_id = null;
                    resolve(this);
                }
            });
        });

        return p;
    }

    /**
     * Pull a value for a board -- should ensure the board ID is valid for
     * the loaded API key/token combination.
     */
    checkBoard() {
        if (! this.board_id) return Promise.reject('no_board_id');
        var p = new Promise((resolve, reject) => {
            this.trello.get(`/1/boards/${this.board_id}/shortUrl`, (err, resp) => {
                if (err) reject(err);
                else {
                    if (resp._value && resp._value.length > 0) resolve(this);
                    else reject('no_val');
                }
            });
        });

        return p;        
    }

    newCard(name, desc, list_id, due, labels) {
        var card = {
            'name': name,
            'desc': desc,
            'idList': list_id,
            'due': due ? due : null,
            'idLabels': labels ? labels.join(",") : null
        };

        var p = new Promise((resolve, reject) => {
            this.trello.post('1/cards', card, (err, resp) => {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        return p;
    }

    addLinkToCard(card_id, desc, url) {
        var p = new Promise((resolve, reject) => {
            this.trello.post(`/1/cards/${card_id}/attachments`, 
            { 'url': url, 'name': desc }, function (err, resp) {
                if (err) reject(err);
                resolve(resp);
            })
        });
    
        return p;
    }

    setCardCover(card_id, attachment_id) {
        var p = new Promise((resolve, reject) => {
            this.trello.put(`/1/cards/${card_id}`, { 'idAttachmentCover': attachment_id }, 
            function(err, resp) {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        return p;
    }

    uploadToCard(card_id, filename) {
        if (! fs.existsSync(filename)) return Promise.reject('not_found');

        var p = new Promise((resolve, reject) => {
            this.trello.post(`/1/cards/${card_id}/attachments`, {
                'attachment': fs.createReadStream(filename) }, function(err, resp) {
                    if (err) reject(err);

                    // this must be a node-trello bug?
                    resolve(JSON.parse(resp));
                }
            );
        });

        return p;
    }

    uploadAsCover(card_id, filename) {
        var p = new Promise((resolve, reject) => {
            this.uploadToCard(card_id, filename).then((resp) => {
                var attachment_id = resp.id;

                this.setCardCover(card_id, attachment_id).then((resp) => {
                    resolve(resp);
                }, reject);
            }, reject);
        });

        return p;
    }

    loadCardBasic(card_id) {
        return this.loadCard(card_id, ['name','desc','due','labels','closed','shortUrl']);
    }

    loadCard(card_id, fields) {
        if (! fields) fields = 'all';
        else if (typeof fields == 'object') fields = fields.join(",");

        var p = new Promise((resolve, reject) => {
            this.trello.get(`/1/cards/${card_id}`, { 'fields': fields, 'attachments': false }, function(err, resp) {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        return p;
    }

    updateCard(card_id, new_name, new_desc, new_due, closed) {
        var upd = {};
        if (new_name) upd.name = new_name;
        if (new_desc) upd.desc = new_desc;
        if (new_due) upd.due = new_due;
        if (closed === true) upd.closed = true;

        var p = new Promise((resolve, reject) => {
            this.trello.put(`/1/cards/${card_id}`, upd, function(err, resp) {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        return p;
    }

    moveCard(card_id, new_list_id) {
        var p = new Promise((resolve, reject) => {
            this.trello.put(`/1/cards/${card_id}`, { 'idList': new_list_id }, function(err, resp) {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        return p;
    }

    getLabel(name) {
        var l = null;
        for (var i = 0; i < this.label_cache.length; i++) {
            if (this.label_cache[i].name == name) {
                l = this.label_cache[i];
                break;
            }
        }

        return l;
    }

    createLabel(name, color) {
        var label = {
            'idBoard': this.board_id,
            'name': name,
            'color': color
        };

        var p = new Promise((resolve, reject) => {
            this.trello.post(`/1/labels`, label, (err, resp) => {
                if (err) reject(err);
                else {
                    this.label_cache.push( { id: resp.id, name: resp.name });
                    resolve(resp);
                }
            });
        });

        return p;
    }

    getLabels() {
        var p = new Promise((resolve, reject) => {
            this.trello.get(`/1/boards/${this.board_id}/labels`, (err, data) => {
                if (err) reject(err);
                else {
                    resolve(this.cacheLabels(data));
                }
            });	
        });
    
        return p;	
    }    

    getListCards(list_id) {
        var filter = {'fields': 
            ['id', 'desc', 'name', 'closed', 'shortUrl', 'due', 'dueComplete', 'labels'].join(",")
        };
        var p = new Promise((resolve, reject) => {
            this.trello.get(`/1/lists/${list_id}/cards`, filter, function(err, data) {
                if (err) reject(err);
                else resolve(data);
            });	
        });
    
        return p;	
    }

    getList(name) {
        var l = null;
        for (var i = 0; i < this.list_cache.length; i++) {
            if (this.list_cache[i].name == name) {
                l = this.list_cache[i];
                break;
            }
        }

        return l;        
    }

    createList(name) {
        var list = {
            'idBoard': this.board_id,
            'name': name,
            'pos': 'bottom'    
        };

        var p = new Promise((resolve, reject) => {
            this.trello.post(`/1/lists`, list, (err, resp) => {
                if (err) reject(err);
                else {
                    this.list_cache.push( { id: resp.id, name: resp.name });
                    resolve(resp);
                }
            });	
        });
    
        return p;        
    }

    closeList(id) {
        var p = new Promise((resolve, reject) => {
            this.trello.put(`/1/lists/${id}/closed`, { value: true }, (err, resp) => {
                if (err) reject(err);
                else resolve(resp);
            });
        });
    }

    getLists(include_archived) {
        var filter = { 'fields': ['id','name','closed'].join(","), 'filter': 'all' };
        var p = new Promise((resolve, reject) => {
            this.trello.get(`/1/boards/${this.board_id}/lists`, filter, (err, data) => {
                if (err) reject(err);
                else {
                    var lists = include_archived ? data : data.filter((l) => { return l.closed == false; });
                    resolve(this.cacheLists(lists));
                }
            });	
        });
    
        return p;
    }

    cacheLabels(l) {
        this.label_cache = _clone(l);
        return l;
    }

    cacheLists(l) {
        this.list_cache = _clone(l);
        return l;
    }
}

function _clone(o) {
    return JSON.parse(JSON.stringify(o));
}

TrelloApi.LABEL_COLORS = LABEL_COLORS;

module.exports = TrelloApi;