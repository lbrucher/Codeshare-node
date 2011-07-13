var	sessions = require('../sessions.mem.js'),
		assert = require('assert');

process.env.NODE_ENV = 'test';

function testCreate() {
	sessions.init();
	var numSessions = sessions.all().length;
	var s = sessions.createNew('albert');
	assert.equal(numSessions+1, s.id);
	assert.equal('albert', s.candidateName);
	
	var sGet = sessions.get(s.id);
  assert.equal(s.id, sGet.id);
  assert.equal(s.candidateName, sGet.candidateName);
}

function testGet() {
	sessions.init();
	assert.equal(1, sessions.get(1).id);	
	assert.equal(2, sessions.get(2).id);	
	assert.isNull( sessions.get(3) );
	assert.isNull( sessions.get(99) );
	assert.isNull( sessions.get(null) );
}

function testRemove() {
	sessions.init();
	var numSessions = sessions.all().length;
	sessions.createNew('albert');
	assert.equal(3, sessions.all().length);

	sessions.remove(2);
	assert.equal(1, sessions.get(1).id);	
	assert.equal(3, sessions.get(3).id);	
	assert.isNull( sessions.get(2) );
}

module.exports = {
    'testCreate': testCreate,
    'testGet': testGet,
    'testRemove': testRemove,
};

