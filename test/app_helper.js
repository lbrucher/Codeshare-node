process.env.NODE_ENV = 'test';

var testCase = require('nodeunit').testCase


function clearSessionsDB(callback) {
	// TODO remove all sessions from the DB
	console.log("Clearing all sessions from DB...")
	callback();
}

exports.testSuite = function( app, tests ) {

	var __firstTest = true;
	var __testCount = 0;
	for(var k in tests)	__testCount++;

	return testCase( {

		setUp: function (callback) {
			if (__firstTest) {
				__firstTest = false;
				clearSessionsDB(callback);
			} else {
				callback();
			}
		}

		,tearDown: function (callback) {
				//console.log("teardown");
				if (--__testCount <= 0) {
					console.log("Shutting down app");
					app.close();
				}
				callback();
		}
		
		,tests: tests
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

