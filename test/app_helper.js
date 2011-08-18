process.env.NODE_ENV = 'test';

var testCase = require('nodeunit').testCase


exports.testSuite = function( app, tests ) {

	var __testCount = 0;
	for(var k in tests)	__testCount++;
	//console.log("Num tests: "+__testCount);

	return testCase( {

		setUp: function (callback) {
				//console.log("setup");
				callback();
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

