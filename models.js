

function defineModels(mongoose, callback) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;


  UserSchema = new Schema({
    'username': { type: String, required: true, index: { unique: true } },
    'password_hashed': String,
    'first_name': String,
    'last_name': String
  });

  UserSchema.virtual('password')
		.set(function(password) {
			this._password = password;
			this.password_hashed = this.encryptPassword(password);
    })
    .get(function() { return this._password; });

	UserSchema.method('authenticate', function(pwdClear) {
	    return this.encryptPassword(pwdClear) === this.password_hashed;
	});
	
  UserSchema.method('encryptPassword', function(pwdClear) {
    return Hash.sha1(pwdClear);
  });


	mongoose.model('UserSchema', UserSchema);

	callback();
}

exports.defineModels = defineModels; 

