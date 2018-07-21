'use strict';
const fs = require('fs');
const path = require('path');

class TrommelConfig {
	constructor(keyfile, deffilename) {
		this.keyfile = keyfile ? keyfile : this.defaultKeyFilename();
		this.deffile = deffilename ? deffilename : this.findDefFile(TrommelConfig.DEF_FILENAME);

		this.def = null;
		this.keys = null;
		this.project_keys = null;

		this.valid = null;
	}

	addProjectToKeyFile(id, key, token) {
		if (! fs.existsSync(this.keyfile)) {
			var result = this.initKeyFile(this.keyfile);
			if (! result) return false;
		}

		var keys = _json(this.keyfile, true);

		//allow ovewriting...
		//if (keys[id]) return false;

		var key_def = { 'api_key': key, 'api_token': token };
		keys[id] = key_def;

		var succ = false;
		try {
			fs.writeFileSync(this.keyfile, JSON.stringify(keys, null, 2));
			succ = true;
		} catch(e) {

		}

		// reload entire key list
		if (succ) this.keys = _json(this.keyfile);

		return succ;
	}

	writeProjectId(id, board_id) {
		if (this.deffile && fs.existsSync(this.deffile)) {
			// project ID already written..
			return false;
		} else {
			var write_succ = false;

			var pid = { id: id, board_id: board_id };

			try {
				fs.writeFileSync(this.deffile, JSON.stringify(pid, null, 2));
				write_succ = true;
			} catch(e) {}

			return write_succ;
		}
	}

	apiKey() {
		if (! this.valid) return null;
		return this.project_keys.api_key;
	}

	apiToken() {
		if (! this.valid) return null;
		return this.project_keys.api_token;
	}

	boardId() {
		if (! this.valid) return null;
		return this.def.board_id;
	}

	validate() {
		this.validation_error = null;

		var vr = function() {
			if (! fs.existsSync(this.keyfile)) return "Key file not found.";
			if (! fs.existsSync(this.deffile)) return "Project Definition file not found.";

			if (! this.validateDefFile()) return `Project Definition file (${this.deffile}) not accessible/valid.`;
			if (! this.validateKeyFile()) return `Key file (${this.keyfile}) not accessible/valid.`;

			if (! this.getKeysForProject()) return `No key defined for project: ${this.def.id}`;

			return null;
		};

		this.validation_error = vr.call(this);

		this.valid = this.validation_error === null ? true : false;

		return this.valid;
	}

	getKeysForProject() {
		var proj_keys = this.keys[this.def.id];
		if (proj_keys && typeof proj_keys == 'object') {
			if (typeof proj_keys.api_key != 'string' || typeof proj_keys.api_token != 'string') this.project_keys = null;
			else this.project_keys = proj_keys;
		} else this.project_keys = null;

		return this.project_keys != null;
	}

	validateDefFile() {
		var df = {};
		try {
			df = _json(this.deffile);
		} catch(e) {}

		if (! df || typeof df != 'object') return false;

		if (! typeof df.id == 'string') return false;
		if (! typeof df.board_id == 'string') return false;

		this.def = df;

		return true;
	}

	validateKeyFile() {
		var kf = {};
		try {
			kf = _json(this.keyfile);
		} catch(e) {}

		if (! kf || typeof kf != 'object') return false;

		this.keys = kf;
		return true;
	}

	findDefFile(filename) {
		var done = false;
		var def = null;

		var path_parts = path.parse(process.cwd()).dir.split(path.sep);
		while (!done) {
			if (path_parts.length == 0) break;
			var np = path.join(path.join.apply(path_parts), filename);
			try {
				if (fs.existsSync(np)) var def = np; 
				else path_parts.pop();
			} catch(e) {
				done = true;
			}

			if (def) done = true;
		}
		
		return def ? def : path.join(process.cwd(), filename);
	}

	initKeyFile(fn) {
		var data = {
			'__example': { 'api_token': 'tokentoken', 'api_key': 'keykey' }
		};

		var succ = false;
		try {
			fs.writeFileSync(fn, JSON.stringify(data, null, 2));
			this.keyfile = fn;

			succ = true;
		} catch(e) {
			// couldn't write file.
		}

		return succ;
	}

	defaultKeyFilename() {
		return path.join(process.env['HOME'], '.trommel_keys');
	}
}

TrommelConfig.Explicit = function(api_key, api_token, board_id) {
	var tc = new TrommelConfig(null, null);
	tc.def  = { 'id': '-', 'board_id': board_id };
	tc.project_keys = { 'api_token': api_token, 'api_key': api_key };

	tc.valid = true;
	return tc;
};

TrommelConfig.DEF_FILENAME = '.trommel_id';

function _json(f, empty_obj) {
	var o = empty_obj === true ? {} : null;

	try {
		o = JSON.parse(fs.readFileSync(f));
	} catch(e) {}

	return o;
}

module.exports = TrommelConfig;