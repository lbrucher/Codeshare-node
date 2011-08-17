var	sessions = require('../sessions.mem.js'),
		assert = require('assert');

process.env.NODE_ENV = 'test';

function testCreate() {
	sessions.init();
	assert.equal(0, sessions.all('albert').length);
	var s = sessions.createNew('albert');
	assert.equal(1, sessions.all('albert').length);
	assert.equal(s, sessions.all('albert')[0]);
	
	var s2 = sessions.get(s.id);
  assert.equal(s.id, s2.id);
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
      'testCreate': testCreate
//    , 'testGet': testGet
//		, 'testRemove': testRemove
};

