'use strict';
const fs = require('fs');
const path = require('path');

const TrommelConfig = require('../../lib/trommel/config');
const TrelloApi = require('../../lib/trello-api');

const ROOT = path.resolve(__dirname, 'vfs');

class TestProject {
    constructor(api_key, api_token) {
        this.board_id = null;
        this.api_key  = api_key;
        this.api_token = api_token;

        this.id = Math.floor(Date.now() / 1000).toString();
        this.dir = null;
    }

    defFile() {
        return path.resolve(this.dir, '.trommel_id');
    }

    keyFile() {
        return path.resolve(this.dir, 'keys.json');
    }

    init() {
        if (! this.api_token || ! this.api_key) return Promise.reject('no_creds');

        var succ = this.makeTestDir();
        if (! succ) return Promise.reject('mkdir_fail');

        var p = new Promise((resolve, reject) => {
            this.makeBoard().then((id) => {
                this.board_id = id;

                /** @type {TrommelConfig} */
                var tc = new TrommelConfig(this.keyFile(), this.defFile());

                tc.addProjectToKeyFile(this.id, this.api_key, this.api_token);
                tc.writeProjectId(this.id, this.board_id);

                resolve();
            });    
        });
        
        return p;
    }

    trommelConfig() {
        return {
            'quiet': true,
            'key-file': this.keyFile(),
            'def-file': this.defFile(),
            'api-key': this.api_key,
            'api-token': this.api_token,
            'board-id': this.board_id
        };
    }

    makeTestDir() {
        var dir_name = path.join(ROOT, this.id);

        try {
            fs.mkdirSync(dir_name);
            this.dir = dir_name;
        } catch(e) {

        }

        return fs.existsSync(this.dir) ? true : false;
    }

    /**
     * @return {TrelloApi}
     */
    tapi(board_id) {
        if (! board_id) board_id = null;

        var tapi = new TrelloApi(board_id, this.api_key, this.api_token);
        return tapi;
    }

    makeBoard() {
        var tapi = this.tapi();
    
        var board_name = 'test-' + this.id;
    
        var p = new Promise((resolve, reject) => {
            tapi.newBoard(board_name, '[delete me]').then((resp) => {
                resolve(resp.board_id);
            }, reject);
        });
    
        return p;    
    }

    closeBoard() {
        if (! this.board_id) return Promise.reject('no_board_id');

        var p = new Promise((resolve, reject) => {
            this.tapi(this.board_id).closeBoard().then(() => {
                resolve(true);
            }, reject);
        });

        return p;
    }

    tearDown() {
        var p = new Promise((resolve, reject) => {
            this.closeBoard().then(() => {
                var succ = true;
                [this.keyFile(), this.defFile(), this.dir].forEach((res) => {
                    var result = _rm(res);
                    succ = succ && result;
                });

                if (succ) resolve(true);
                else reject('rm_fail');
            }, reject);
        });

        return p;
    }
}

function _rm(f) {
    var succ = true;
    try {
        var st = fs.statSync(f);
        if (st.isFile()) {
            fs.unlinkSync(f);
        } else if (st.isDirectory()) {
            fs.rmdirSync(f);
        }
    } catch(e) {
        succ = false;
    }

    return succ;
}

module.exports = TestProject;