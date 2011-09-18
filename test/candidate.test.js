var helper = require('./app_helper.js')
	, assert = require('assert')
	, sid = null		// local SessionID for the session we create during setup()
	;


// test for:
// invalid code, valid code, invalid code after session closed, invalid code after session deleted
// valid code after session reopened


module.exports = helper.testSuite( {

suiteSetup: function(callback) {
//	var browser = tobi.createBrowser(app, { external: true });
	console.log('>> Test init - creating first session...');
	var browser = helper.createBrowser();
	helper.login(browser, function() {
		browser.get('/interviewer', function(res, $){
			res.should.have.status(200);
			browser.click('a#create', function(res,$){
				res.should.have.status(200);
				sid = parseInt( $('#sessions #sessionId:eq(0)').text() );

				console.log('<< Test init done - SID = '+sid);
				callback();
			});
		});
	});
}

/*
,
suiteTearDown: function(callback) {
	callback();
}
*/

,
tests: {
testEnterInvalidCode: function(test) {
	var browser = helper.createBrowser();
	browser.get('/candidate', function(res, $){
		res.should.have.status(200);
		$('form').should.not.have.one('span#error');
		browser.fill({'code':sid+1}).submit(function(res,$){
			$('form').should.have.one('span#error');
			$('#error').should.have.text(/^Invalid code!/);	
			test.done();
		});
	});
}

,
testEnterValidCode: function(test) {
	var browser = helper.createBrowser();
	browser.get('/candidate', function(res, $){
		res.should.have.status(200);
		$('form').should.not.have.one('span#error');
		browser.fill({'code':sid}).submit(function(res,$){
			$('form').should.not.have.one('span#error');
			assert.equal(3, browser.history.length);
			assert.equal('/candidate/session/'+sid, browser.history[2]);
			test.done();
		});
	});
}

}});
