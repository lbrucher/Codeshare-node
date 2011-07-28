
/**
 * Module dependencies.
 */

var isDebug = false;

var express = require('express'),
		stylus = require('stylus'),
		cf = require("cloudfoundry"),
		users = require('./users.mem'),
		sessions = require('./sessions.mem');

var app = module.exports = express.createServer();

//var host = process.env.VCAP_APP_HOST || 'localhost';
var port = Number(process.env.PORT || process.env.VCAP_APP_PORT || 8000);


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
	users.init(app);
	sessions.init(app);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	isDebug = true;
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
	isDebug = false;
});


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


function secured(req, res, next) {
	if (req.session.username)
	{
		var user = users.get(req.session.username);
		if (user != null)
		{
			req.user = user;
			next();
			return;
		}
	}

	res.redirect('/interviewer/login');
}


// ===============================================
// ROUTING
// ===============================================

app.get('/', function(req, res){
  res.redirect('/candidate');
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
	var user = users.validate(req.body.username, req.body.password);
	if (user == null)
		res.render('interviewer/login.jade', {interviewer:true});
	else
	{
		console.log("login OK for ["+user.username+"]");
		req.session.username = user.username;
		res.redirect('/interviewer');
	}
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

app.listen(port);
console.log("Server listening on port %d in %s mode", app.address().port, app.settings.env);

