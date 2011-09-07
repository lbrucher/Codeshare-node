function TextareaTracker(_elTA, _textChangedCallback)
{
	this.elTA = _elTA;
	this.textChangedCallback = _textChangedCallback;

	// gets a timeout to keep track of changes in the TA.
	// textChangedCallback() gets invoked when that timeout expires.
	this.changeTracker = null;

	// last know content of the TA
	this.text = null;


	var self=this;
	this.elTA.onkeydown = function(e) {self.ta_onkeydown(e);};
	this.elTA.onkeyup = function(e) {self.ta_textChanged(e);};
}

// Enables tabbing in text area
// Credit goes to See[Mike]Code, http://i.seemikecode.com
TextareaTracker.prototype.ta_onkeydown = function(evt)
{
	var e = window.event || evt;
	var k = e.keyCode ? e.keyCode : e.charCode ? e.charCode : e.which;
	if (k == 9) {
		var t = e.target ? e.target : e.srcElement ? e.srcElement : e.which;
		if (t.setSelectionRange)
		{	// chrome 1.0...
			e.preventDefault();
			var ss = t.selectionStart;
			var se = t.selectionEnd;
			var pre = t.value.slice(0, ss);
			var post = t.value.slice(se, t.value.length);
			t.value = pre + "\t" + post;
			t.selectionStart = ss + 1;
			t.selectionEnd = t.selectionStart;
		}
		else
		{	// ie6...
			e.returnValue = false;
			var r = document.selection.createRange();
			r.text = "\t";
			r.setEndPoint("StartToEnd", r);
			r.select();
		}
	}
}

TextareaTracker.prototype.ta_textChanged = function(evt)
{
	var e = window.event || evt;
	var t = e.target ? e.target : e.srcElement ? e.srcElement : e.which;

	this.onTextChanged(t.value);
}

TextareaTracker.prototype.onTextChanged = function(newText)
{
	if (this.text == newText)
		return;

	if (this.changeTracker != null)
		clearTimeout(this.changeTracker);

	var self = this;
	this.text = newText;
	this.changeTracker = setTimeout( function() { self.textChangedCallback(self.text) }, 1000);
}




function Codeshare(_sessionId, _baseUrl, _lastOtherUpdateTime)
{
	this.sessionId = _sessionId;
	this.lastOtherUpdateTime = _lastOtherUpdateTime;
	this.urlSessionClosed = _baseUrl + '/closed';
	this.urlRefreshOtherText = _baseUrl + '/refreshOtherText';
	this.urlUpdateMyText = _baseUrl + '/updateMyText';
	this.urlUpdateMyComments = _baseUrl + '/updateMyComments';

	this.myTextTracker = null;
	this.myCommentsTracker = null;
	this.otherUpdater = null;

	this.logCounter = 0;
	this.setLog(null);
}

Codeshare.prototype.setLog = function(_elLog)
{
	if (_elLog) {
		this.log = function(msg) {
			_elLog.innerHTML = (++this.logCounter) + ": " + msg + "<br/>" + _elLog.innerHTML;
		}
	} else {
		this.log = function(msg) {};
	}
}

Codeshare.prototype.setTexts = function(_elMyText, _elOtherText, _elCommentsText)
{
	var self = this;
	this.elOtherText = _elOtherText;
	this.myTextTracker = new TextareaTracker(_elMyText, function(text) {self.updateMyText(text);});
	if (_elCommentsText)
		this.myCommentsTracker = new TextareaTracker(_elCommentsText, function(text) {self.updateMyComments(text)});
}

Codeshare.prototype.start = function()
{
	this.setOtherUpdater();
}

Codeshare.prototype.stop = function()
{
	this.unsetOtherUpdater();
}

Codeshare.prototype.setOtherUpdater = function()
{
	this.unsetOtherUpdater();
	var self = this;
	this.otherUpdater = setTimeout( function() { self.refreshOtherText() }, 4000);
}

Codeshare.prototype.unsetOtherUpdater = function()
{
	if (this.otherUpdater != null)
		clearTimeout(this.otherUpdater);
	this.otherUpdater = null;
}

Codeshare.prototype.updateOtherText = function(data)
{
	if (!data.sessionOpen)
	{
		window.location.href = this.urlSessionClosed;
		return;
	}

	if (data.hasOtherText)
	{
		this.lastOtherUpdateTime = data.lastOtherUpdateTime;
		this.elOtherText.value = data.otherText;
	}
}

Codeshare.prototype.refreshOtherText = function()
{
	try
	{
		this.log("Requesting other text update...");

		var self = this;
		var ts = new Date().getTime();

		$.get(this.urlRefreshOtherText+'/'+self.lastOtherUpdateTime,
			  { ts:ts }
			, function(data, status) {
				if (status == 'success')
					self.updateOtherText(data);
				else
					self.log("UpdateOtherText: status:["+status+"]");
				self.setOtherUpdater();
			  }
			, "json"
		);
	}
	catch(e)
	{
		this.setOtherUpdater();
	}
}


Codeshare.prototype.updateMyText = function(newText)
{
	this.unsetOtherUpdater();

	try
	{
		this.log("Sending updated my text...");

		var self = this;
		$.post(this.urlUpdateMyText,
			{
				myText:newText,
				lastOtherUpdateTime:self.lastOtherUpdateTime
			},
			function(data, status) {
				if (status == 'success')
					self.updateOtherText(data);
				else
					self.log("UpdateMyText: status:["+status+"]");
				self.setOtherUpdater();
			},
			"json"
		);
	}
	catch(e)
	{
		this.setOtherUpdater();
	}
}


Codeshare.prototype.updateMyComments = function(newText)
{
	try
	{
		this.log("Sending updated comments...");
		var self = this;
		$.post(this.urlUpdateMyComments,
			{
				myComments:newText
			},
			function(data, status) {
				if (status != 'success')
					self.log("UpdateMyComments: status:["+status+"]");
			},
			"json"
		);
	}
	catch(e)
	{
	}
}


/*
Codeshare.prototype.enableLogging = function()
{
	this.logCounter = 0;
	this.log = function(msg) {
		var el = document.getElementById("log");
		el.innerHTML = (++this.logCounter) + ": " + msg + "<br/>" + el.innerHTML;
	}
}
*/		
	
//setOtherUpdater(true);
//setTimeout("document.getElementById('myText').focus()", 200);


