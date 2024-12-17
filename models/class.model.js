const mongoose = require('mongoose');
const {model, Schema} = mongoose;

const classSchema = new Schema({
  name: String,
  semester: { type: Schema.Types.ObjectId, ref: 'semesters' },
  teacher: { type: Schema.Types.ObjectId, ref: 'users' },
  students: [{ type: Schema.Types.ObjectId, ref: 'users' }],
  schedules: [{ type: Schema.Types.ObjectId, ref: 'schedules' }],
  is_active: {
    type: Boolean,
    default: true
  },
  code: {
    type: String,
    unique: true
  },
  assist_code: String
}, { timestamps: true });

classSchema.post('findOneAndUpdate', async function (doc, next) {
  // Solo proceder si el estado cambia a inactivo
  if (doc && doc.is_active === false) {
    const User = mongoose.model('users');  // Obtener el modelo de usuario
    
    // Eliminar la referencia de la clase de los usuarios
    // (profesores y estudiantes)
    await User.updateMany(
      { classes: doc._id },  // Encontrar usuarios con esta clase
      { $pull: { classes: doc._id } }  // Remover la referencia de la clase
    );
  }
  next();
});

classSchema.pre('save', async function(next) {
  if (!this.code) {
    this.code = await generateUniqueCode();
  }
  next();
});

module.exports = model('classes', classSchema);

async function generateUniqueCode(){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var code
  
  while(true){
    var code = ''
  
    for (var i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const clase = await model('classes').findOne({code: code})
    if(!clase){
      break
    }
  }

  return code;
}