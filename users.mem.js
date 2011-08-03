var _users = [];

module.exports = {

	init: function(app) {
		if (app.settings.env == 'development') {
			_users = [
				{username:'joe', password:Hash.sha1('joe'), firstName:'Joe', lastName:'Smith'},
				{username:'admin', password:Hash.sha1('admin'), firstName:'Admin', lastName:'User'},
			];
		}
		else if (app.settings.env == 'production') {
			_users = [
				{username:'admin', password:Hash.sha1('C0mplexPwd'), firstName:'Admin', lastName:'User'},
			];
		}
	},

	get: function(username) {
		for(var i=0; i<_users.length; i++)
			if (_users[i].username == username)
				return _users[i];
		return null;
	},
	
	validate: function(username,pwdClear) {
		var user = this.get(username);
		if (user == null)
			return null;
		if (user.password == Hash.sha1(pwdClear))
			return user;
		return null;
	},

	list: function() {
		return _users;
	},

	createNew: function(username,password,fn,ln, callback) {

		if (this.get(username) != null) {
			callback("Username already exists!");
			return;
		}			

		// TODO verify PWD


		var user = {username:username, password:Hash.sha1(password), firstName:fn, lastName:ln};
		_users.push(user);
		
		callback(null);
	},
	
	remove: function(username, callback) {
		for(var i=0; i<_users.length; i++) {
			if (_users[i].username == username) {
				_users.splice(i,1);
				callback(null);
				return;
			}
		}
		callback("cannot find username");
	}
};

