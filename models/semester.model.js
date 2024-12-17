const { model, Schema } = require('mongoose');

const semesterSchema = new Schema({
  semester: Number,
  start_date: String,
  end_date: String,
  
});

module.exports = model('semesters', semesterSchema);