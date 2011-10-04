var crypto = require('crypto');


function defineModels(mongoose, callback) {
	var   Schema = mongoose.Schema
		, ObjectId = Schema.ObjectId
		;


	// ----------------------------------------
	// SAVED TEXT
	// ----------------------------------------
	SavedTextSchema = new Schema({
		  'name': { type: String, required: true, index: { unique: true } }
		, 'description': String
		, 'content': String
	});

	mongoose.model('SavedTextSchema', SavedTextSchema);


	// ----------------------------------------
	// USER GROUP
	// ----------------------------------------
	UserGroupSchema = new Schema({
		  'name': { type: String, required: true, index: { unique: true } }
		, 'saved_texts': [SavedTextSchema]
	});

	mongoose.model('UserGroupSchema', UserGroupSchema);


	// ----------------------------------------
	// USER
	// ----------------------------------------
	UserSchema = new Schema({
		  'username': { type: String, required: true, index: { unique: true } }
		, 'password_hashed': String
		, 'first_name': String
		, 'last_name': String
		, 'salt': String
		, '_group': { type: Schema.ObjectId, ref: 'UserGroupSchema' }
	});

	UserSchema.virtual('password')
		.set(function(password) {
			this._password = password;
			this.salt = this.makeSalt();
			this.password_hashed = this.encryptPassword(password);
		})
		.get(function() { return this._password; });

	UserSchema.method('makeSalt', function() {
		return Math.round((new Date().valueOf() * Math.random())) + '';
	});

	UserSchema.method('authenticate', function(pwdClear) {
		return this.encryptPassword(pwdClear) === this.password_hashed;
	});
	
	UserSchema.method('encryptPassword', function(pwdClear) {
		return crypto.createHmac('sha1', this.salt).update(pwdClear).digest('hex');
	});


	mongoose.model('UserSchema', UserSchema);




	callback();
}

exports.defineModels = defineModels; 

