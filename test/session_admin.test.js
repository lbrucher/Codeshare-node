process.env.NODE_ENV = 'test';
var
		tobi = require('tobi')
	, assert = require('assert')
	, testCase = require('nodeunit').testCase
	, app = require('../app.js')
	, browser = tobi.createBrowser(app)
	;

/*
function testSuite( testMethods ) {

	return testCase({

		setup: function (callback) {
				console.log("setup");
				callback();
		}

		,tearDown: function (callback) {
				console.log("teardown");
				app.close();
				callback();
		}

		,testSuite:
				testMethods
	});
	
}
*/


function login(browser, callback) {

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

	
module.exports = testCase( {

testSessionList: function(test) {
		console.log("111");
		login(browser, function() {
				browser.get('/interviewer', function(res, $){
						res.should.have.status(200);
						res.should.have.header('Content-Length');
						res.should.have.header('Content-Type', 'text/html; charset=utf-8');
						$('#content').should.have.one('#sessions');
						$('#sessions').should.have.one('#open');

						test.done();
				});
		});
}

,testAddSession: function(test) {
		console.log("2222");
		browser.get('/interviewer', function(res, $){
				res.should.have.status(200);
				browser.click('a#create', function(res,$){
						res.should.have.status(200);
						$('#content').should.have.one('#sessions');
				
						test.done();
				});
		});
}

});

