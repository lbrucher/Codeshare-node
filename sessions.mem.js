var _sessions = [];

module.exports = {

	init: function() {
		_sessions = [
			{id:1,open:true,candidateName:'joe', interviewerText:'Some interviewer text', candidateText:'some candidate text...', interviewerTextLastUpdateTime:new Date(), candidateTextLastUpdateTime:new Date()},
			{id:2,open:false,candidateName:'albert', interviewerText:'', candidateText:'', interviewerTextLastUpdateTime:new Date(), candidateTextLastUpdateTime:new Date()},
		];
	},

	all: function() {
		return _sessions;
	},

	get: function(id) {
		for(var i=0; i<_sessions.length; i++)
			if (_sessions[i].id == id)
				return _sessions[i];
		return null;
	},
	
	createNew: function(candidateName) {
		var elt = {
			id:_sessions.length+1,
			open:true,
			candidateName:candidateName||null,
			interviewerText:'',
			candidateText:'',
			interviewerTextLastUpdateTime:new Date(),
			candidateTextLastUpdateTime:new Date()
		};
	
		_sessions.push(elt);
		return elt;
	},
	
	remove: function(id) { 
		for(var i=0; i<_sessions.length; i++)
			if (_sessions[i].id == id)
			{
				_sessions.splice(i,1);
				return;
			}
	}

};

