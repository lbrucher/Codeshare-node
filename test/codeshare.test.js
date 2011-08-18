var helper = require('./app_helper.js')
	, tobi = require('tobi')
	, assert = require('assert')
	, app = require('../app.js')
	,
	;


module.exports = helper.testSuite(app, {

testTextExchange: function(test) {
	var browser = tobi.createBrowser(app, { external: true });
	helper.login(browser, function() {
		browser.get('/interviewer', function(res, $){
			res.should.have.status(200);
			browser.click('a#create', function(res,$){
				res.should.have.status(200);
				$('#content').should.have.one('#sessions');
				$('#sessions table').should.have.one('tr');
				var sid = $('#sessions #sessionId:eq(0)').text();
				var doneCounter = 2;

				// Start interviewer
				browser.get('/interviewer/session/'+sid, function(res, $){
//					console.log('i['+$('#myText').text()+']');
//					console.log('i['+$('#otherText').text()+']');

//					var cs = new Codeshare(sid, '/interviewer/session/'+sid, null, $('#myText'), $('#otherText'), null);
//					cs.start();

					// start from a blank page
					assert.equal('\n', $('#myText').text());
					assert.equal('\n', $('#otherText').text());

					$('#myText').focus();
					$('#myText').html('some text...');
					$('#myText').keypress();

					console.log('i['+$('#myText').text()+']');
//					cs.myTextChanged($('#myText').text());

					setTimeout( function() {

						console.log('log-i['+$('#log').text()+']');
						if (--doneCounter == 0)
							test.done();
					}, 5000 );

				});


				// Start candidate
				browser.get('/candidate/session/'+sid, function(res, $){
//					console.log('c['+$('#myText').text()+']');
//					console.log('c['+$('#otherText').text()+']');

					// start from a blank page
					assert.equal('\n', $('#myText').text());
					assert.equal('\n', $('#otherText').text());

					setTimeout( function() {
						console.log('c['+$('#otherText').text()+']');


						if (--doneCounter == 0)
							test.done();
						
					}, 3000);


				});

			});
		});
	});
}

});

