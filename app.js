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
var app;

var LOG_ERROR=1, LOG_WARNING=2, LOG_DEBUG=3, LOG_TRACE=4;



// //////////////////////////////////////////////////////////////////////////
// HELPERS
// //////////////////////////////////////////////////////////////////////////

function log(level, message) {
	if (level <= app.set('log-level'))
		console.log(message);
}

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


function isAdmin(req) {
	return req.session.username == 'admin';
}


function login(req,res,username, password) {
	log(LOG_TRACE,'Logging in <'+username+'>...');
	User.findOne({username:username}, function(err,user) {
		if (user && user.authenticate(password)) {
			console.log("login OK for ["+user.username+"]");
			req.session.username = user.username;
			req.session.userid = user._id;
			res.redirect('/interviewer');
		}
		else {
			log(LOG_TRACE, 'login FAILED for <'+username+'>');
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
	if (isAdmin(req))
	{
		next();
		return;
	}
	
	res.redirect('/interviewer');
}

function securedAdminOrCurrentUser(req, res, next) {
	if (isAdmin(req) || req.session.userid == req.params.id)
	{
		next();
		return;
	}
	
	res.redirect('/interviewer');
}


function findUserText(user, textId) {
	for(var i=0; i<user.texts.length; i++) {
		if (user.texts[i]._id == textId)
			return i;
	}
	return -1;
}


function isJson(req) {
	return req.header('Accept', 'text/html').indexOf('application/json') != -1;
}


// //////////////////////////////////////////////////////////////////////////
// SERVER CREATION
// //////////////////////////////////////////////////////////////////////////

module.exports.createServer = function() {

	// Application/Server    
	try {
		if (isHttps) {
			var serverOptions = {
				key: fs.readFileSync(__dirname+'/privatekey.pem'),
				cert: fs.readFileSync(__dirname+'/certificate.pem')
			};
			console.log("Creating new HTTPS server...");
			app = express.createServer(serverOptions);
		} else {
			console.log("Creating new HTTP server...");
			app = express.createServer();
		}
	}
	catch(e) {
		console.log("EXCEPTION while creating HTTP server: "+e);
	}


	app.shutdown = function(callback) {
		this.close();
		callback();
	}


// Configuration
app.configure(function(){
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
	app.set('log-level', LOG_DEBUG);
	app.set('db-uri', 'mongodb://localhost/codeshare-test');
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	isDebug = true;
});

app.configure('development', function(){
	app.set('log-level', LOG_DEBUG);
	app.set('db-uri', 'mongodb://localhost/codeshare');
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	isDebug = false;
});

app.configure('production', function(){
  app.set('log-level', LOG_WARNING);
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
//	app.UserGroup = UserGroup = mongoose.model('UserGroupSchema');
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


// ===============================================
// ROUTING
// ===============================================

app.get('/', function(req, res){
	res.render('index.jade');
});

// ---------------------------
// USER/GROUP MANAGEMENT
// ---------------------------
app.get('/user', secured, function(req,res){
	if (isAdmin(req)) {
	User.find({}, function(err, users) {
			if (!err)
		res.render('user/list.jade', {currentUser:req.user, users:users});
	});
	} else {
		res.render('user/profile.jade', {currentUser:req.user});
	}
});

app.get('/user/new', secured, securedAdmin, function(req,res){
	res.render('user/userNew.jade', {currentUser:req.user, user:new User(), error:null});
});

app.post('/user/new', secured, securedAdmin, function(req,res){
	var user = new User(req.body.user);
	user.save(function(err) {
		if (err)
			res.render('user/userNew.jade', {currentUser:req.user, user:user, error:err});
		else
			res.redirect('/user');
	});
});

app.get('/user/:id', secured, securedAdmin, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else
			res.render('user/userEdit.jade', {currentUser:req.user, user:user, error:null});
	});
});

app.put('/user/:id', secured, securedAdmin, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else {
			user.first_name = req.body.user.first_name;
			user.last_name = req.body.user.last_name;

			user.save(function(err) {
				res.redirect('/user');
			});
		}
	});
});

app.get('/user/:id/pwd', secured, securedAdminOrCurrentUser, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else
			res.render('user/userChgPwd.jade', {currentUser:req.user, user:user, error:null});
	});
});

app.put('/user/:id/pwd', secured, securedAdminOrCurrentUser, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else {
			user.password = req.body.password;

			user.save(function(err) {
				res.redirect('/user');
			});
		}
	});
});

app.del('/user/:id', secured, securedAdmin, function(req,res){
/*
	users.remove(req.params.un, function(err) {
		res.redirect('/users');
	});
*/
		res.redirect('/user');
});


app.get('/user/:id/texts', secured, securedAdminOrCurrentUser, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else {
			res.render('user/textsList.jade', {currentUser:req.user, user:user});
		}
	});
});

app.get('/user/:id/texts/new', secured, securedAdminOrCurrentUser, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else
			res.render('user/textsNew.jade', {currentUser:req.user, user:user, savedtext:new SavedText({name:'',description:'',content:''}), error:null});
	});
});

app.post('/user/:id/texts/new', secured, securedAdminOrCurrentUser, function(req,res){

	var ajax = isJson(req);
	
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err) {
			if (ajax)
				res.send('user not found',500);
			else
				res.redirect('/user');
		}
		else {
			var text = new SavedText(req.body.savedtext);
			user.texts.push(text);
			user.save(function(err) {
				if (ajax) {
					if (err)
						res.send('could not save user:'+err,500);
					else
						res.send(JSON.stringify(text),200);
				}
				else {
					if (err)
						res.render('user/textsNew.jade', {currentUser:req.user, user:user, savedtext:text, error:err});
					else
						res.redirect('/user/'+user._id+'/texts');
				}
			});
		}
	});
});

app.get('/user/:id/texts/:tid', secured, securedAdminOrCurrentUser, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else {
			var index = findUserText(user, req.params.tid);
			if (index == -1)
				res.redirect('/user/'+user._id+'/texts');
			else
				res.render('user/textsEdit.jade', {currentUser:req.user, user:user, savedtext:user.texts[index], error:null});
		}
	});
});

app.put('/user/:id/texts/:tid', secured, securedAdminOrCurrentUser, function(req,res){
	var ajax = isJson(req);
console.log('TXT UPDATE: '+JSON.stringify(req.body.savedtext));
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err) {
			if (ajax)
				res.send('user not found',500);
			else
				res.redirect('/user');
		}
		else {
			var index = findUserText(user, req.params.tid);
			if (index == -1) {
				if (ajax)
					res.send('cannot find text',500);
				else
					res.render('user/textsEdit.jade', {currentUser:req.user, user:user, savedtext:req.body.savedtext, error:'Unknown saved text!'});
			}
			else {
				var text = user.texts[index];
				text.name = req.body.savedtext.name;
				text.description = req.body.savedtext.description;
				text.content = req.body.savedtext.content;

				user.save(function(err) {
					if (ajax) {
						if (err)
							res.send('could not save text:'+err,500);
						else
							res.send('ok',200);
					}
					else {
						if (err)
							res.render('user/textsEdit.jade', {currentUser:req.user, user:user, savedtext:text, error:err});
						else
							res.redirect('/user/'+user._id+'/texts');
					}
				});
			}
		}
	});
});

app.del('/user/:id/texts/:tid', secured, securedAdminOrCurrentUser, function(req,res){
	User.findOne({_id:req.params.id}, function(err,user) {
		if (err)
			res.redirect('/user');
		else {
			var index = findUserText(user, req.params.tid);
			if (index == -1)
				res.redirect('/user/'+user._id+'/texts');
			else {
				user.texts.splice(index,1);

				user.save(function(err) {
					res.redirect('/user/'+user._id+'/texts');
				});
			}
		}
	});
});





/*
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
*/


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

app.get('/interviewer/session/:id/details', secured, function(req,res){
	var s = sessions.get(req.params.id);
	if (s != null)
		res.render('interviewer/details.jade', {interviewer:true, currentUser:req.user, session:s});
	else
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
	log(LOG_TRACE, 'Interviewer: checking for candidate text update');
	res.send( getRefreshedText(sessions.get(req.params.id), req.params.lastOtherUpdateTime, "candidate") );
});

app.post('/interviewer/session/:id/updateMyText', secured, function(req,res){
	//console.log('Intervierwer: update my text ['+req.params.id+'], body ['+req.body.myText+']');
	var s = sessions.get(req.params.id);
	if (s != null && s.open)
	{
		s.interviewerText = req.body.myText;
		s.interviewerTextLastUpdateTime = new Date();
		sessions.update(s);
		log(LOG_DEBUG,'Interviewer: updated session <'+s.id+'> with new interviewer text');
	}
	else
	{
		log(LOG_DEBUG,'Interviewer: cannot update interviewer text, session null or closed!');
	}

	res.send( getRefreshedText(s, req.body.lastOtherUpdateTime, "candidate") );
});

app.post('/interviewer/session/:id/updateMyComments', secured, function(req,res){
	var s = sessions.get(req.params.id);
	if (s != null && s.open)
	{
		s.interviewerComments = req.body.myComments;
		sessions.update(s);
	}
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
	log(LOG_TRACE, 'Candidate: checking for interviewer text update');
	res.send( getRefreshedText(sessions.get(req.params.id), req.params.lastOtherUpdateTime, "interviewer") );
});

app.post('/candidate/session/:id/updateMyText', function(req,res){
	var s = sessions.get(req.params.id);
	if (s != null && s.open)
	{
		s.candidateText = req.body.myText;
		s.candidateTextLastUpdateTime = new Date();
		sessions.update(s);
		log(LOG_DEBUG,'Candidate: updated session <'+s.id+'> with new candidate text');
	}
	else
	{
		log(LOG_DEBUG,'Candidate: cannot update candidate text, session null or closed!');
	}

	res.send( getRefreshedText(s, req.body.lastOtherUpdateTime, "interviewer") );
});

	return app;
}

module.exports.app = app;

