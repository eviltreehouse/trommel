'use strict';
const path = require('path');
const fs   = require('fs');

const TrommelConfig = require('./trommel/config');
const TrommelBoard = require('./trommel/board');

const TrommelBuilder = require('./trommel/builder');
const TrelloApi = require('./trello-api');

const OPT_DEFAULTS = {
	'key-file': path.resolve(process.env.HOME, '.trommel_keys.json'), /* API Key / token per project id */
	'def-file': null, /* project ID in repo */
	'api-key': null,
	'api-token': null,
	'board-id': null,
	'verbose': false,
	'quiet': false
};

class Trommel {
	constructor(o) {
		/** @type {TrelloApi} */
		this.t_api = null;

		if (! o) o = Object.assign({}, OPT_DEFAULTS);
		else o = Object.assign({}, OPT_DEFAULTS, o);

		this.envOverride(o);

		this.is_quiet = o.quiet ? true : false;
		this.is_verbose = o.verbose && !this.is_quiet ? true : false;

		this.config = null;
		if ( o['api-key'] && o['api-token'] && o['board-id']) 
			this.config = TrommelConfig.Explicit(o['api-key'], o['api-token'], o['board-id']);
		else {
			this.config = new TrommelConfig(o['key-file'], o['def-file']);
			this.config.validate();
		}		
	}
	
	quiet() {
		this.is_quiet = true;
		return this;
	}

	requireValidConfig() {
		if (! this.config.valid) {
			console.error("Error:", this.config.validation_error);
			return false;
		} else return true;
	}

	/**
	 * @return {TrommelBoard}
	 */
	boardManager() {
		return new TrommelBoard(this.config.boardId(), this.trello());
	}
	
	/**
	 * @return {TrelloApi} t_api
	 */
	trello() {
		if (! this.t_api) this.t_api = new TrelloApi(this.config.boardId(), this.config.apiKey(), this.config.apiToken());
		return this.t_api;
	}

	runCLICommand(cli_cmd, cli_args) {
		if (! cli_cmd[0]) {
			this.usage();
			process.exit(1);
		}

		var succ = false;
		switch(cli_cmd[0].toLowerCase()) {
			case 'setup':
				succ = this.goSetup(cli_args);
				break;
			case 'init':
				succ = this.requireValidConfig() && this.goInit();
				break;
			default:
				console.error("Invalid command: " + cli_cmd[0]);
				process.exit(1);
		};

		if (typeof succ === 'boolean') {
			// sync exit
			process.exit(succ ? 0 : 1);
		} else {
			succ.then(() => {
				process.exit(0);
			}, (err) => {
				this.croak(err);
				process.exit(1);
			});
		}
	}

	goSetup(a) {
		if (! _requires(a, ['id', 'boardId', 'apiKey', 'apiToken'])) {
			console.log("Usage: trommel setup --id my_project --board-id Xy1bd12 --api-key=abc1def --api-token=989fgeedq2");
			return this.croak();
		}

		var proceed = this.config.addProjectToKeyFile(a.id, a.apiKey, a.apiToken);
		if (! proceed) return this.croak('Could not write/update key file at', this.config.keyfile);

		proceed &= this.config.writeProjectId(a.id, a.boardId);
		if (! proceed) return this.croak('Could not write project ID file at', this.config.deffile);

		return this.success(`Project '${a.id}' set up successfully.`);
	}

	goInit() {
		var t = this.trello();
		var p = new Promise((resolve, reject) => {
			t.checkBoard().then(() => {
				var b = TrommelBuilder.WithConfig(this.config);
				b.buildLabels().then(() => {
					b.buildLists().then(() => {
						b.makeMetaCard().then(() => {
							this.success(`Project '${t.board_id}' board construction successful.`);
							resolve();
						}, reject);
					}, reject);
				}, reject);
			}, reject);
		});

		return p;
	}

	envOverride(o) {
		if (process.env['TROMMEL_KEY_FILE'] && fs.existsSync(process.env['TROMMEL_KEY_FILE'])) {
			o['key-file'] = process.env['TROMMEL_KEY_FILE'];
		}
	}

	croak() {
		if (! arguments.length) return false;
		if (this.is_quiet) return false;

		var arr = Array.prototype.slice.apply(arguments);
		arr.unshift('[Error]');

		console.error.apply(console, arr);
		return false;
	}
	
	success() {
		if (! arguments.length) return true;
		if (this.is_quiet) return true;

		var arr = Array.prototype.slice.apply(arguments);
		arr.unshift('[OK]');

		console.log.apply(console, arr);
		return true;
	}

	usage() {
		console.log("Usage: trommel [setup | init]");
	}
}

function _requires(provided, needs) {
	var ok = true;

	if (needs.length == 0) return ok;

	for (var ni in needs) {
		if (typeof provided[needs[ni]] == 'undefined') {
			ok = false;
			break;
		}
	}

	return ok;
}

/**
 * @return {Trommel}
 */
module.exports = function(o) {
	return new Trommel(o);	
};