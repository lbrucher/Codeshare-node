
function Codeshare(_sessionId, _lastOtherUpdateTime, _baseUrl)
{
	this.sessionId = _sessionId;
	this.lastOtherUpdateTime = _lastOtherUpdateTime;
	this.urlSessionClosed = _baseUrl + '/closed';
	this.urlRefreshOtherText = _baseUrl + '/refreshOtherText';
	this.urlUpdateMyText = _baseUrl + '/updateMyText';
	
	this.otherUpdater = null;
	this.myUpdater = null;
	this.myText = null;

	this.log = function(msg) {};
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
		document.getElementById("otherText").value = data.otherText;
	}
}

Codeshare.prototype.refreshOtherText = function()
{
	try
	{
		this.log("Requesting other text update...");

		var self = this;

		$.get(this.urlRefreshOtherText+'/'+self.lastOtherUpdateTime,
			function(data, status) {
				if (status == 'success')
					self.updateOtherText(data);
				else
					self.log("UpdateOtherText: status:["+status+"]");
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


Codeshare.prototype.updateMyText = function()
{
	this.unsetOtherUpdater();

	try
	{
		this.log("Sending updated my text...");

		var self = this;

		$.post(this.urlUpdateMyText,
			{
				myText:self.myText,
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

// Enables tabbing in text area
// Credit goes to See[Mike]Code, http://i.seemikecode.com
//		
Codeshare.prototype.textarea_onkeydown = function(evt)
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


Codeshare.prototype.textarea_textChanged = function(evt)
{
	var e = window.event || evt;
	var t = e.target ? e.target : e.srcElement ? e.srcElement : e.which;
	var txt = t.value;

	if (this.myText == txt)
		return;

	//this.log("textarea changed: ["+txt+"]");

	if (this.myUpdater != null)
			clearTimeout(this.myUpdater);
	var self = this;
	this.myText = txt;
	this.myUpdater = setTimeout( function() { self.updateMyText() }, 1000);
}

Codeshare.prototype.enableLogging = function()
{
	this.logCounter = 0;
	this.log = function(msg) {
		var el = document.getElementById("log");
		el.innerHTML = (++this.logCounter) + ": " + msg + "<br/>" + el.innerHTML;
	}
}
		
	
//setOtherUpdater(true);
//setTimeout("document.getElementById('myText').focus()", 200);


