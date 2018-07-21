const assert = require('simple-assert');
const fs = require('fs');

const TestProject = require('./fixtures/test-project');
const Trommel = require('../lib/trommel');

describe("Trommel: TestProject Fixture Tests", () => {
    /** @type {TestProject} */
    var proj;
    var project_id;

    before(function() {
        if (! process.env.TRELLO_API_TOKEN || ! process.env.TRELLO_API_KEY) {
            return this.skip("No API credentials");
        }
    });

    it("Create a TestProject", function(done) {
        this.timeout(4000);

        try {
            proj = new TestProject(process.env.TRELLO_API_KEY, process.env.TRELLO_API_TOKEN);
            assert(proj);

            proj.init().then(() => {
                try {
                    var proj_dir = proj.dir;
                    assert(fs.existsSync(proj_dir), 'proj dir is missing');
                    assert(fs.existsSync(proj.keyFile()), 'key file is missing ' + proj.keyFile());
                    assert(fs.existsSync(proj.defFile()), 'def file is missing ' + proj.defFile());
                    
                    project_id = proj.id;

                    done();
                } catch(e) {
                    done(e);
                }
            }, done);
        } catch(e) {
            done(e);
        }
    });

    it("Try to use it", function(done) {
        if (! proj) {
            this.skip("no project");
            return done();
        }

        var trommel = Trommel({ quiet: true, 'key-file': proj.keyFile(), 'def-file': proj.defFile() });
        assert(trommel.config.valid, 'config isnt valid');
        assert(trommel.config.apiKey() == proj.api_key, 'API key isnt right');
        assert(trommel.config.apiToken() == proj.api_token, 'API token isnt right');
        assert(typeof trommel.config.boardId() === 'string', 'board ID isnt set');

        done();
    });

    it("Teardown a TestProject", function(done) {
        if (! proj) return this.skip("no project");

        var succ = proj.tearDown().then((succ) => {
            try {
                assert(succ, 'teardown was not successful');

                var proj_dir = proj.dir;
                assert(! fs.existsSync(proj.keyFile()), 'keyfile is still there');
                assert(! fs.existsSync(proj.defFile()), 'def file is still there');
                assert(! fs.existsSync(proj_dir), 'proj dir is still there');

                done();
            } catch(e) {
                done(e);
            }
        }, done);
    });
});