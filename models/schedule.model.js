const mongoose = require('mongoose');
const {model, Schema} = mongoose;

const scheduleSchema = new Schema({
  start: String,
  end: String,
  day: String,
  classes: [{ type: Schema.Types.ObjectId, ref: 'classes' }]
}, { timestamps: true });

module.exports = model('schedules', scheduleSchema);