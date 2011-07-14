var _users = [];

module.exports = {

	init: function(app) {
		if (app.settings.env == 'development') {
			_users = [
				{username:'joe', password:'joe', firstName:'Joe', lastName:'Smith'},
				{username:'admin', password:'admin', firstName:'Admin', lastName:'User'},
			];
		}
		else if (app.settings.env == 'production') {
			_users = [
				{username:'admin', password:'admin', firstName:'Admin', lastName:'User'},
			];
		}
	},

	get: function(username) {
		for(var i=0; i<_users.length; i++)
			if (_users[i].username == username)
				return _users[i];
		return null;
	},
	
	validate: function(username,password) {
		var user = this.get(username);
		if (user == null)
			return null;
		if (user.password == password)
			return user;
		return null;
	},

};

