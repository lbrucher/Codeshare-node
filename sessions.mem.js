var _sessions = [];

function findSessions(username) {
	for(var i=0; i<_sessions.length; i++)
		if (_sessions[i].username == username)
			return {valid:true, sessions:_sessions[i].sessions};
	return {valid:false, sessions:[]};
}

function isIdUsed(id) {
		for(var i=0; i<_sessions.length; i++)
		{
			var sessions = _sessions[i].sessions;
			if (sessions.some(function(el,i,a) { return el.id == id; }))
				return true;
		}
		return false;
}

function createNewSessionId() {
	var id;
	var counter = 0;
	var maxCounter = 100;
	do {
		id = Math.floor( Math.random() * 10000 );
		counter++;
	} while( counter < maxCounter && isIdUsed(id) );

	console.log("createNewSessionId: counter = "+counter);

	if (counter >= maxCounter)
		return null;

	return id;
}

module.exports = {

	init: function() {
		if (process.env.NODE_ENV == 'development') {
			_sessions = [
				{username:'admin', sessions:[
					{id:1,open:true, createdOn:new Date(2011,1,10), candidateName:'joe', interviewerText:'Some interviewer text', candidateText:'some candidate text...', interviewerTextLastUpdateTime:new Date(), candidateTextLastUpdateTime:new Date()},
					{id:2,open:false, createdOn:new Date(2010,11,22), candidateName:'albert', interviewerText:'', candidateText:'', interviewerTextLastUpdateTime:new Date(), candidateTextLastUpdateTime:new Date()},
				]},
			];
		}
	},

	all: function(username) {
		return findSessions(username).sessions;
	},

	allOpen: function(username) {
		return findSessions(username).sessions.filter(function(el,i,a) { return el.open; });
	},

	allClosed: function(username) {
		return findSessions(username).sessions.filter(function(el,i,a) { return !el.open; });
	},

	get: function(id) {
		for(var i=0; i<_sessions.length; i++)
		{
			var sessions = _sessions[i].sessions;
			if (sessions != null)
			{
				for(var j=0; j<sessions.length; j++)
					if (sessions[j].id == id)
						return sessions[j];
			}
		}
		return null;
	},
	
	createNew: function(username) {
		var newId = createNewSessionId();
		if (newId == null)
			return null;

		var elt = {
			id:newId,
			open:true,
			createdOn: new Date(),
			comments:null,
			interviewerText:'',
			candidateText:'',
			interviewerTextLastUpdateTime:new Date(),
			candidateTextLastUpdateTime:new Date()
		};

		var entry = findSessions(username);
		if (!entry.valid)
		{
			entry = {username:username, sessions:[]};
			_sessions.push(entry);
		}

		entry.sessions.push(elt);
		return elt;
	},

	update: function(aSession) {
		// nothing to do here
	},
	
	remove: function(id) { 
		for(var i=0; i<_sessions.length; i++)
		{
			var sessions = _sessions[i].sessions;
			if (sessions != null)
			{
				for(var j=0; j<sessions.length; j++)
					if (sessions[j].id == id)
					{
						sessions.splice(j,1);
						return;
					}
			}
		}
	}

};

