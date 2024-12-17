const mongoose = require('mongoose');
const {model, Schema} = mongoose;

const attendanceSchema = new Schema({
  day: String,
  class: { type: Schema.Types.ObjectId, ref: 'classes' },
  schedule: { type: Schema.Types.ObjectId, ref: 'schedules' },
  // attendance: 'present' | 'absent' | 'late'
  attendance: [{
    student: { type: Schema.Types.ObjectId, ref: 'users' },
    attendance:{
      type: Number,
      enum: [0,1,2],
      default: 0
    }
  }],
}, { timestamps: true });

module.exports = model('attendances', attendanceSchema);