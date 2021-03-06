var helper = require('./app_helper.js')
	, assert = require('assert')
	, sessions = require('../sessions.mem.js')
	;


module.exports = helper.testSuite( {

tests: {
testSessionList: function(test) {
	var browser = helper.createBrowser();
	helper.login(browser, function() {
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
	var browser = helper.createBrowser();
	helper.login(browser, function() {
		browser.get('/interviewer', function(res, $){
			res.should.have.status(200);
			browser.click('a#create', function(res,$){
				res.should.have.status(200);
				$('#content').should.have.one('#sessions');

				test.done();
			});
		});
	});
}

}});

