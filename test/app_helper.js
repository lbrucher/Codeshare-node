process.env.NODE_ENV = 'test';

var   app = null
	, testCase = require('nodeunit').testCase
	, App = require('../app.js')
	, tobi = require('tobi')
	;



function _clearSessionsDB(callback) {
	// TODO remove all sessions from the DB
	console.log("Clearing all sessions from DB...")
	callback();
}

function _suiteSetup(next) {
	_clearSessionsDB( function() {
		app = App.createServer();
		next();
	});		
}

function _suiteTearDown(next) {
	if (app)
		app.shutdown(next);
	else
		next();
}


exports.app = app;

exports.createBrowser = function() {
	return tobi.createBrowser(app, { external: true });
}

exports.testSuite = function(testSuite) {

	var __moduleSetup = testSuite['suiteSetup'] || function(cb) { cb(); };
	var __moduleTearDown = testSuite['suiteTearDown'] || function(cb) { cb(); };
	var __moduleTests = testSuite['tests'];

	var __firstTest = true;
	var __testCount = 0;
	for(var k in __moduleTests)	__testCount++;

	return testCase( {

		setUp: function (callback) {
			if (__firstTest) {
				__firstTest = false;
				_suiteSetup( function() { __moduleSetup(callback); });
			} else {
				callback();
			}
		}

		,tearDown: function (callback) {
				//console.log("teardown");
				if (--__testCount <= 0) {
					_suiteTearDown( function() { __moduleTearDown(callback); });
				}
				else
					callback();
		}
		
		,tests: __moduleTests
	});

}



exports.login = function(browser, callback) {

	browser.get('/interviewer/login', function(res, $){
		$('form')
			.fill({ username: 'admin', password: 'admin' })
			.submit(function(res, $){
				res.should.have.status(200);
				res.should.have.header('Content-Length');
				res.should.have.header('Content-Type', 'text/html; charset=utf-8');
				callback(res,$);
			});
	});

}

