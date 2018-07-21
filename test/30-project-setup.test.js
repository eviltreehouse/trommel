const assert = require('simple-assert');
const path = require('path');
const fs = require('fs');

const Trommel = require('../lib/trommel');

const VFS = path.join(__dirname, 'fixtures', 'vfs');

const PROJDIR = path.join(VFS, 't1'+Date.now());
const PROJDIR2 = path.join(VFS, 't2'+Date.now());

const KEYFILE = path.join(VFS, 'keys.json');
const DEFFILE = path.join(PROJDIR, 'project.def');
const DEFFILE2 = path.join(PROJDIR2, 'project.def');

describe("Trommel: Project Setup", () => {
    before(() => {
        fs.mkdirSync(PROJDIR);
        fs.mkdirSync(PROJDIR2);
    });
    after(() => {
        clean([ KEYFILE, DEFFILE, DEFFILE2 ]);
        fs.rmdirSync(PROJDIR);
        fs.rmdirSync(PROJDIR2);
    });

    it("We can setup our 1st virtual project", () => {
        var conf = generateTestConfig();

        assert(typeof conf === 'object');

        var trommel = Trommel(conf);
        assert(trommel);

        var setup = generateSetupTemplate();
        assert(typeof setup === 'object');

        var succ = trommel.goSetup(setup);
        assert(succ, 'goSetup did not succeed!');
    });

    it("We can setup our 2nd virtual project", () => {
        var conf = generateTestConfig(2);

        assert(typeof conf === 'object');

        var trommel = Trommel(conf);
        assert(trommel);

        var setup = generateSetupTemplate(2);
        assert(typeof setup === 'object');

        var succ = trommel.goSetup(setup);
        assert(succ, 'goSetup did not succeed!');
    });
    
    it("Ensure our keys are all present", () => {
        var keys = JSON.parse( fs.readFileSync(KEYFILE) );
        assert(typeof keys === 'object');

        assert(typeof keys['test-project'] === 'object', 'no key def for test-project');
        assert(typeof keys['test-project-two'] === 'object', 'no key def for test-project-two');

        assert(keys['test-project'].api_key === 'deadbeef00');
        assert(keys['test-project-two'].api_key === 'deadbeef22');
    });

    it("Try to instantiate ourselves in the context of our project", () => {
        var conf = generateVerifyConfig();
        assert(typeof conf === 'object');

        var trommel = Trommel(conf);
        assert(trommel);

        assert(trommel.config.valid, 'config valid = ' + trommel.config.valid + " -> " + trommel.config.validation_error);

        assert(trommel.config.apiKey() === 'deadbeef00');
        assert(trommel.config.apiToken() === '00facadecafe');
        assert(trommel.config.boardId() === '59gm34g');
    });
});

function generateVerifyConfig() {
    return {
        'quiet': true,
        'key-file': KEYFILE,
        'def-file': DEFFILE
    };    
}

function generateSetupTemplate(t) {
    if (! t) {
        return {
            'boardId': '59gm34g',
            'apiToken': '00facadecafe',
            'apiKey': 'deadbeef00',
            'id': 'test-project'
        };
    } else {
        return {
            'boardId': '5fai41j23g',
            'apiToken': '00fac22adecafe',
            'apiKey': 'deadbeef22',
            'id': 'test-project-two'
        };        
    }
}

function generateTestConfig(t) {
    return {
        'quiet': true,
        'key-file': KEYFILE,
        'def-file': t ? DEFFILE2 : DEFFILE
    };
}

function clean(files) {
    for (var i in files) {
        if (fs.existsSync(files[i])) fs.unlinkSync(files[i]);
    }
}