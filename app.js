// Modules
var express = require('express'),
		stylus = require('stylus'),
		fs = require('fs'),
		mongoose = require('mongoose'),
		models = require('./models'),
		sessions = require('./sessions.mem');


// Globals
var db;
var User, Session, UserGroup, SavedText;
var isDebug = false;
var isHttps = false;
var autologin = true;

// Application/Server    
var app;
if (isHttps) {
	var serverOptions = {
		key: fs.readFileSync(__dirname+'/privatekey.pem'),
		cert: fs.readFileSync(__dirname+'/certificate.pem')
	};
	app = express.createServer(serverOptions);
} else {
	app = express.createServer();
}
module.exports = app;

//var host = process.env.VCAP_APP_HOST || 'localhost';
var port = Number(process.env.PORT || process.env.VCAP_APP_PORT || 8000);


// Configuration
app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	//app.use(express.logger());
	app.use(stylus.middleware({ src: __dirname + '/public' }));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: "4roo0cff 3elk" }));
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));

	sessions.init(app);
});

app.configure('test', function(){
	app.set('db-uri', 'mongodb://localhost/codeshare-test');
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	isDebug = true;
});

app.configure('development', function(){
	app.set('db-uri', 'mongodb://localhost/codeshare');
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	isDebug = true;
});

app.configure('production', function(){
	app.set('db-uri', process.env.MONGOHQ_URL);
	app.use(express.errorHandler()); 
	isDebug = false;
});


// This is especially needed for unit tests, or the process will never exit.
app.on('close', function() {
	mongoose.disconnect();
});


// MONGOOSE
models.defineModels(mongoose, function() {
	app.User = User = mongoose.model('UserSchema');
	app.UserGroup = UserGroup = mongoose.model('UserGroupSchema');
	app.SavedText = SavedText = mongoose.model('SavedTextSchema');

	db = mongoose.connect(app.set('db-uri'));

/*
	// See if there is an admin group. If not, create a standard one.
	var adminGroup = null;
	UserGroup.findOne( {name:'admin'}, function(err,group) {
		adminGroup = group;
		if (!group) {
			// Create the admin group
			adminGroup = new UserGroup({name:'admin');
			adminGroup.save(function(err) {
				if (err)
					console.log('FAILED creating the admin group: '+err);
				else
					console.log('Created the admin group');
			});
		}
	});
*/

	// See if there is an admin account. If not, create a standard one.
	User.findOne( {username:'admin'}, function(err,user) {
		if (!user) {
			// Create the admin account
			user = new User({username:'admin', password:'admin', first_name:'super', last_name:'user'});
			user.save(function(err) {
				if (err)
					console.log('FAILED creating the admin account: '+err);
				else
					console.log('Created the admin account');
			});
		}
	});

})



// HELPERS

function getRefreshedText(aSession, lastUpdateTime, who)
{
	if (aSession == null || !aSession.open)
		return { sessionOpen:false };

	if ( eval("aSession."+who+"TextLastUpdateTime.getTime()") > lastUpdateTime)
	{
		return {
			sessionOpen:true, 
			hasOtherText:true, 
			otherText:eval("aSession."+who+"Text"),
			lastOtherUpdateTime:eval("aSession."+who+"TextLastUpdateTime.getTime()")
		};
	}

	return { sessionOpen:true, hasOtherText:false };
}


function login(req,res,username, password) {
	console.log('Logging in ['+username+']...');
	User.findOne({username:username}, function(err,user) {
		if (user && user.authenticate(password)) {
			console.log("login OK for ["+user.username+"]");
			req.session.username = user.username;
			res.redirect('/interviewer');
		}
		else {
			console.log("login FAILED for ["+username+"]");
			res.render('interviewer/login.jade', {interviewer:true});
		}
	});
}


function secured(req, res, next) {
	if (req.session.username)
	{
		User.findOne({username:req.session.username}, function(err,user) {
			if (user) {
				req.user = user;
				next();
			}
			else {
				res.redirect('/interviewer/login');
			}
		});
	}
	else if (autologin && app.settings.env == 'development')
	{
		login(req,res,'admin', 'admin');
	}
	else
		res.redirect('/interviewer/login');
}


function securedAdmin(req, res, next) {
	if (req.session.username == 'admin')
	{
		next();
		return;
	}
	
	res.redirect('/interviewer');
}


function findGroupSavedText(group, savedTextId) {
	for(var i=0; i<group.saved_texts.length; i++) {
		if (group.saved_texts[i]._id == savedTextId)
			return i;
	}
	return -1;
}



// ===============================================
// ROUTING
// ===============================================

app.get('/', function(req, res){
	res.render('index.jade');
});

// ---------------------------
// USER/GROUP MANAGEMENT
// ---------------------------
app.get('/users', secured, securedAdmin, function(req,res){
	User.find({}, function(err, users) {
		if (!err) {
			UserGroup.find({}, function(err2, groups) {
				res.render('user/list.jade', {currentUser:req.user, users:users, groups:groups});
			});
		}
	});
});

app.get('/users/new', secured, securedAdmin, function(req,res){
	res.render('user/userNew.jade', {currentUser:req.user, user:new User(), error:null});
});

app.post('/users/new', secured, securedAdmin, function(req,res){
	var user = new User(req.body.user);
	user.save(function(err) {
		if (err)
			res.render('user/userNew.jade', {currentUser:req.user, user:user, error:err});
		else
			res.redirect('/users');
	});
});

app.get('/users/:id', secured, securedAdmin, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/users');
		else
			res.render('user/userEdit.jade', {currentUser:req.user, user:user, error:null});
	});
});

app.put('/users/:id', secured, securedAdmin, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/users');
		else {
			user.first_name = req.body.user.first_name;
			user.last_name = req.body.user.last_name;

			user.save(function(err) {
				res.redirect('/users');
			});
		}
	});
});

app.get('/users/:id/pwd', secured, securedAdmin, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/users');
		else
			res.render('user/userChgPwd.jade', {currentUser:req.user, user:user, error:null});
	});
});

app.put('/users/:id/pwd', secured, securedAdmin, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/users');
		else {
			user.password = req.body.password;

			user.save(function(err) {
				res.redirect('/users');
			});
		}
	});
});

app.del('/users/:id', secured, securedAdmin, function(req,res){
/*
	users.remove(req.params.un, function(err) {
		res.redirect('/users');
	});
*/
		res.redirect('/users');
});


app.get('/groups/new', secured, securedAdmin, function(req,res){
	res.render('user/groupNew.jade', {currentUser:req.user, group:new UserGroup({name:''}), error:null});
});

app.post('/groups/new', secured, securedAdmin, function(req,res){
	var text = new SavedText();
	text.name = 'dummy';

	var group = new UserGroup();
	group.name = req.body.group.name;

	group.save(function(err) {
		if (err)
			res.render('user/groupNew.jade', {currentUser:req.user, group:group, error:err});
		else
			res.redirect('/users');
	});
});

app.get('/groups/:id', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (err)
			res.redirect('/users');
		else
			res.render('user/groupEdit.jade', {currentUser:req.user, group:group, error:null});
	});
});

app.put('/groups/:id', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		group.name = req.body.group.name;
		group.save(function(err) {
			if (err)
				res.render('user/groupEdit.jade', {currentUser:req.user, group:group, error:err});
			else
				res.redirect('/users');
		});
	});
});


app.del('/groups/:id', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (!err) {
			group.remove(function(){
				res.redirect('/users');
			});
		}
		else
			res.redirect('/users');
	});
});


app.get('/groups/:id/texts', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (err)
			res.redirect('/users');
		else {
			res.render('user/groupTextsShow.jade', {currentUser:req.user, group:group});
		}
	});
});

app.get('/groups/:id/texts/new', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (err)
			res.redirect('/users');
		else
			res.render('user/groupTextsNew.jade', {currentUser:req.user, group:group, savedtext:new SavedText({name:'',description:'',content:''}), error:null});
	});
});

app.post('/groups/:id/texts/new', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (err)
			res.redirect('/users');
		else {
			var text = new SavedText(req.body.savedtext);
			group.saved_texts.push(text);

			group.save(function(err) {
				if (err)
					res.render('user/groupTextsNew.jade', {currentUser:req.user, group:group, savedtext:text, error:err});
				else
					res.redirect('/groups/'+group._id+'/texts');
			});
		}
	});
});

app.get('/groups/:id/texts/:tid', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (err)
			res.redirect('/users');
		else {
			var index = findGroupSavedText(group, req.params.tid);
			if (index == -1)
				res.redirect('/groups/'+group._id+'/texts');
			else
				res.render('user/groupTextsEdit.jade', {currentUser:req.user, group:group, savedtext:group.saved_texts[index], error:null});
		}
	});
});

app.put('/groups/:id/texts/:tid', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (err)
			res.redirect('/users');
		else {
			var index = findGroupSavedText(group, req.params.tid);
			if (index == -1)
				res.render('user/groupTextsEdit.jade', {currentUser:req.user, group:group, savedtext:req.body.savedtext, error:'Unknown saved text!'});
			else {
				var text = group.saved_texts[index];
				text.name = req.body.savedtext.name;
				text.description = req.body.savedtext.description;
				text.content = req.body.savedtext.content;

				group.save(function(err) {
					if (err)
						res.render('user/groupTextsEdit.jade', {currentUser:req.user, group:group, savedtext:text, error:err});
					else
						res.redirect('/groups/'+group._id+'/texts');
				});
			}
		}
	});
});

app.del('/groups/:id/texts/:tid', secured, securedAdmin, function(req,res){
	UserGroup.findOne({_id:req.params.id}, function(err,group) {
		if (err)
			res.redirect('/users');
		else {
			var index = findGroupSavedText(group, req.params.tid);
			if (index == -1)
				res.redirect('/groups/'+group._id+'/texts');
			else {
				group.saved_texts.splice(index,1);

				group.save(function(err) {
					res.redirect('/groups/'+group._id+'/texts');
				});
			}
		}
	});
});


// ---------------------------
// INTERVIEWER
// ---------------------------

app.get('/interviewer', secured, function(req,res){
	res.render('interviewer/sessions.jade', {interviewer:true, currentUser:req.user, openSessions:sessions.allOpen(req.user.username), closedSessions:sessions.allClosed(req.user.username)});
});

app.get('/interviewer/login', function(req,res){
	res.render('interviewer/login.jade', {interviewer:true});
});

app.post('/interviewer/login', function(req,res){
	login(req, res, req.body.username, req.body.password);
});

app.get('/interviewer/logout', function(req,res){
	req.session.destroy();
  res.redirect('/interviewer');
});

app.get('/interviewer/createNew', secured, function(req,res){
	sessions.createNew(req.user.username);
  res.redirect('/interviewer');
});

app.get('/interviewer/session/:id/close', secured, function(req,res){
	var s = sessions.get(req.params.id);
	if (s != null && s.open)
	{
		s.open = false;
		sessions.update(s);
	}
	res.redirect('/interviewer');
});

app.get('/interviewer/session/:id/reopen', secured, function(req,res){
	var s = sessions.get(req.params.id);
	if (s != null && !s.open)
	{
		s.open = true;
		sessions.update(s);
	}
	res.redirect('/interviewer');
});

app.get('/interviewer/session/:id/delete', secured, function(req,res){
	sessions.remove(req.params.id);
	res.redirect('/interviewer');
});

app.get('/interviewer/session/:id/closed', secured, function(req,res){
	res.redirect('/interviewer');
});

app.get('/interviewer/session/:id', secured, function(req,res){
	var s = sessions.get(req.params.id);
	if (s == null || !s.open)
		res.redirect('/interviewer');
	else
		res.render('interviewer/session.jade', {interviewer:true, currentUser:req.user, session:s, isDebug:isDebug});
});


app.get('/interviewer/session/:id/refreshOtherText/:lastOtherUpdateTime', secured, function(req,res){
	res.send( getRefreshedText(sessions.get(req.params.id), req.params.lastOtherUpdateTime, "candidate") );
});

app.post('/interviewer/session/:id/updateMyText', secured, function(req,res){
	var s = sessions.get(req.params.id);
	if (s != null && s.open)
	{
		s.interviewerText = req.body.myText;
		s.interviewerTextLastUpdateTime = new Date();
		sessions.update(s);
	}

	res.send( getRefreshedText(s, req.body.lastOtherUpdateTime, "candidate") );
});


// ---------------------------
// CANDIDATE
// ---------------------------

app.get('/candidate', function(req,res){
	res.render('candidate/register.jade', {title:'Candidate', code:'', error:''});
});

app.post('/candidate/register', function(req,res){
	var code = req.body.code;
	var s = sessions.get(code);
	if (s == null)
		res.render('candidate/register.jade', {title:'Candidate', code:code, error:'Invalid code!'});
	else if (!s.open)	
		res.render('candidate/register.jade', {title:'Candidate', code:code, error:'Session is closed!'});
	else
		res.redirect('/candidate/session/'+s.id);
});

app.get('/candidate/session/:id', function(req,res){
	var s = sessions.get(req.params.id);
	if (s == null || !s.open)
		res.redirect('/candidate');
	else
		res.render('candidate/session.jade', {title:'Candidate', session:s, isDebug:isDebug});
});


app.get('/candidate/session/:id/closed', function(req,res){
	res.render('candidate/sessionClosed.jade');
});


app.get('/candidate/session/:id/refreshOtherText/:lastOtherUpdateTime', function(req,res){
	res.send( getRefreshedText(sessions.get(req.params.id), req.params.lastOtherUpdateTime, "interviewer") );
});

app.post('/candidate/session/:id/updateMyText', function(req,res){
	var s = sessions.get(req.params.id);
	if (s != null && s.open)
	{
		s.candidateText = req.body.myText;
		s.candidateTextLastUpdateTime = new Date();
		sessions.update(s);
	}

	res.send( getRefreshedText(s, req.body.lastOtherUpdateTime, "interviewer") );
});



// ===============================================
// START SERVER
// ===============================================
if  (app.settings.env != 'test') {
	app.listen(port);
	console.log("Server listening on port %d in %s mode", app.address().port, app.settings.env);
} else {
	app.url = 'http://localhost:'+port;
}

