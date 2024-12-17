const {model, Schema} = require('mongoose');

const userSchema = new Schema({
  profile_picture: {
    type: String,
    default: '/uploads/default.png'
  },
  name: String,
  last_name: String,
  birthdate: String,
  email: String,
  phone: String,
  control_number: String,
  is_teacher: Boolean,
  password: String,
  classes: [{ type: Schema.Types.ObjectId, ref: 'classes' }],
  is_active: {
    type: Boolean,
    default: true
  },
  notifications: [{
    title: String,
    message: String,
    date: {
      type: Date,
      default: Date.now()
    },
    is_read: {
      type: Boolean,
      default: false
    }
  }]
}, { timestamps: true });

module.exports = model('users', userSchema);