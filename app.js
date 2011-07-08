
/**
 * Module dependencies.
 */

var isDebug = true;
var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


// DEBUG

var sessions = [
	{id:1,open:true,candidateName:'joe', interviewerText:'Some interviewer text', candidateText:'some candidate text...', interviewerTextLastUpdateTime:new Date(), candidateTextLastUpdateTime:new Date()},
	{id:2,open:false,candidateName:'albert', interviewerText:'', candidateText:'', interviewerTextLastUpdateTime:new Date(), candidateTextLastUpdateTime:new Date()},
];


// HELPERS

function getSession(id)
{
	var index = id-1;
	if (index >= 0 && index < sessions.length)
		return sessions[index];
	return null;
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


// ===============================================
// ROUTING
// ===============================================

app.get('/', function(req, res){
  res.redirect('/candidate');
});


// ---------------------------
// INTERVIEWER
// ---------------------------

app.get('/interviewer', function(req,res){
	res.render('interviewer/sessions.jade', {title:'Interviewer', sessions:sessions});
});

app.get('/interviewer/session/:id', function(req,res){
	var s = getSession(req.params.id);
	if (s == null || !s.open)
		res.redirect('/interviewer');
	else
		res.render('interviewer/session.jade', {title:'Interviewer', session:s, isDebug:isDebug});
});


app.get('/interviewer/session/:id/closed', function(req,res){
	res.render('/interviewer');
});


app.get('/interviewer/session/:id/refreshOtherText/:lastOtherUpdateTime', function(req,res){
	res.send( getRefreshedText(getSession(req.params.id), req.params.lastOtherUpdateTime, "candidate") );
});

app.post('/interviewer/session/:id/updateMyText', function(req,res){
	var s = getSession(req.params.id);
	if (s != null && s.open)
	{
		s.interviewerText = req.body.myText;
		s.interviewerTextLastUpdateTime = new Date();
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
	var s = getSession(code);
	if (s == null)
		res.render('candidate/register.jade', {title:'Candidate', code:code, error:'Invalid code!'});
	else if (!s.open)	
		res.render('candidate/register.jade', {title:'Candidate', code:code, error:'Session is closed!'});
	else
		res.redirect('/candidate/session/'+s.id);
});

app.get('/candidate/session/:id', function(req,res){
	var s = getSession(req.params.id);
	if (s == null || !s.open)
		res.redirect('/candidate');
	else
		res.render('candidate/session.jade', {title:'Candidate', session:s, isDebug:isDebug});
});


app.get('/candidate/session/:id/closed', function(req,res){
	res.render('candidate/sessionClosed.jade');
});


app.get('/candidate/session/:id/refreshOtherText/:lastOtherUpdateTime', function(req,res){
	res.send( getRefreshedText(getSession(req.params.id), req.params.lastOtherUpdateTime, "interviewer") );
});

app.post('/candidate/session/:id/updateMyText', function(req,res){
	var s = getSession(req.params.id);
	if (s != null && s.open)
	{
		s.candidateText = req.body.myText;
		s.candidateTextLastUpdateTime = new Date();
	}

	res.send( getRefreshedText(s, req.body.lastOtherUpdateTime, "interviewer") );
});



// ===============================================
// START SERVER
// ===============================================

app.listen(3000);
console.log("Server listening on port %d in %s mode", app.address().port, app.settings.env);

