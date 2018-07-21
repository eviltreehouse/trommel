/**
 * TROMMEL version 0.1.0 -- module and CLI tool for doing 
 * AGILE styled development tracking and management in Trello (trello.com).
 *
 * (C) 2017-2018 Corey Sharrah <corey@eviltreehouse.com>. Released as
 * free software.
 * 
 * Trello has an amazingly comprehensive API and is a very flexible
 * tool that can be utilized in a myriad of ways. TROMMEL's CLI is
 * designed to make state changes of your `corkoard` incredibly easy.
 * The underlying TROMMEL library will let you galvanize your own
 * custom workflow into Trello w/o having to right your own API
 * adapter code.
 */
const yargs = require('yargs');
const Trommel = require('./lib/trommel');

var cli = parseArgs();

var trommel = Trommel(cli.conf);

trommel.runCLICommand(cli.cmd, cli.args);

function parseArgs() {
	var a = { '_cli': true, 'conf': {}, 'cmd': yargs.argv._, 'args': JSON.parse(JSON.stringify(yargs.argv)) };

	['board-id', 'api-token', 'api-key'].forEach((av) => {
		if (a.args[av]) {
			a.conf[av] = a.args[av];
			delete a.args[av];
		}
	});

	delete a.args._;
	//console.log(JSON.stringify(a));

	return a;
}
