const router = require('express').Router();

const mongoose = require('mongoose');
const Class = require('../../models/class.model');
const User = require('../../models/user.model');
const Semester = require('../../models/semester.model');
const Schedule = require('../../models/schedule.model');
const Attendance = require('../../models/attendance.model');
const { application } = require('express');
const { broadcastToClients } = require('../../config/webSocket');

router.post('/', async (req, res) => {
  const { name, teacher_id, semester_id, schedules } = req.body;

  try {

    const semester = await Semester.findById(semester_id);
    
    const clase = await Class.create(
      {name: name, semester: semester_id, teacher: teacher_id,
        assist_code: generateCode(15)}
    );
    const user = await User.findById(teacher_id);
    var days = [];
    var schdls = [];

    for (const schd of schedules){
      //Verificar si no hay un horario ya registrado con los mismos datos
      var schedule = await Schedule.findOne(
        {start: schd.start, end: schd.end, day: schd.day}
      );
      if(!schedule){
        schedule = await Schedule.create(
          {start: schd.start, end: schd.end, day: schd.day}
        );
      }
      days.push(schedule.day);
      schdls.push(schedule);
      schedule.classes.push(clase._id);
      await schedule.save();
      clase.schedules.push(schedule._id);
    };
    
    user.classes.push(clase._id);
    
    const attendancesArray =await createAttendances(
      semester.start_date, semester.end_date, days, schdls, clase._id
    );

    // Attendance.insertMany(attendancesArray);
    for(att of attendancesArray){
      const attendance = await Attendance.create(att);
      attendance.save();
    }

    user.notifications.unshift({
      title: 'Clase creada',
      message: `Se ha creado la clase ${clase.name}`
    });

    clase.save();
    user.save();
    res.json(clase);

  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.post('/all-attendance', async (req, res) => {
  const { attendance_id } = req.body;
  try {
    const attendance = await Attendance.findById(attendance_id);
    const clase = await Class.findById(attendance.class.toString());
    
    for(i = 0; i < attendance.attendance.length; i++){
      attendance.attendance[i].attendance = 1; 
      const id = attendance.attendance[i].student.toString();
      const user = await User.findById(id);
      user.notifications.unshift({
        title: 'Asistencia marcada',
        message: `Se ha marcado tu asistencia en la clase ${clase.name} del día ${attendance.day}`
      });
      await user.save();
    }
    await attendance.save();



    res.status(200).json({message: 'Asistencia marcada'});

  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.get('/', async (req, res) => {
  try {
    const clases = await Class.find().where({is_active: true})
    .populate('teacher')
    .populate('semester')
    .populate('students')
    .populate("schedules");
    res.json(clases);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const clase = await Class.findByIdAndUpdate(
      id, {is_active: false}, {new: true}
    );
    const teacher = await User.findById(clase.teacher);

    teacher.notifications.unshift({
      title: 'Clase eliminada',
      message: `Se ha eliminado la clase ${clase.name}`
    });

    res.json(clase);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const clase = await Class.findById(id)
      ?.populate('teacher')
      ?.populate('semester')
      ?.populate('students') 
      ?.populate("schedules");

    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }
    res.json(clase);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.post('/add-student', async (req, res) => {
  const { student_id, class_code } = req.body;
  try {
    console.log(student_id, class_code);

    const clase = await Class.findOne({code: class_code});
    const user = await User.findById(student_id);
    
    if(!clase){
      return res.status(400).json({message: 'Clase no encontrada'});
    }
    if(!user){
      return res.status(400).json({message: 'Usuario no encontrado'});
    }

    const teacher = await User.findById(clase.teacher);

    const attendances = await Attendance.find({class: clase._id});

    const studentInClass = clase.students.includes(user._id);
    const classInStudent = user.classes.includes(clase._id);

    if(studentInClass || classInStudent){
      return res.status(400).json(
        {message: 'El estudiante ya está inscrito en la clase'}
      );
    }

    for(att of attendances){
      att.attendance.push({student: user._id});
      await att.save();
    }

    clase.students.push(user._id);
    user.classes.push(clase._id);

    user.notifications.unshift({
      title: 'Inscrito en clase',
      message: `Te has inscrito en la clase ${clase.name}`
    });

    teacher.notifications.unshift({
      title: 'Estudiante nuevo en clase',
      message: `Se ha agregado al estudiante ${user.name} a la clase ${clase.name}`
    });

    await teacher.save();
    await clase.save();
    await user.save();
    res.status(200).json({message: 'Estudiante agregado a la clase'});
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.post('/assist/:code', async (req, res) => {
  const code = req.params.code;
  const {student_id, class_id} = req.body;
  try {
    const today = new Date().toISOString().slice(0,10);
    console.log(code)

    // const student = User.findById(student_id);
    const clase = await Class.findById(class_id);
    if(!clase){
      throw new Error("Clase no encontrada");
    }
    const attendance = await Attendance.findOne({class: class_id, day: today})
      .populate('schedule');

    console.warn(clase.assist_code, code);

    if(!attendance){
      throw new Error("Hoy no hay clase");
    }else if(clase.assist_code != code ){
      throw new Error("Código de asistencia incorrecto");
    }

    startTime = new Date(`${today} ${attendance.schedule.start} `);
    const [hour, minute] = attendance.schedule.start.split(':').map(Number);
    assistTime = new Date(`${today} ${hour}:${minute + 15} `);
    endTime = new Date(`${today} ${attendance.schedule.end} `);
    timeNow = new Date();

    if(timeNow < startTime || timeNow > endTime){
      throw new Error("No puedes marcar asistencia fuera de la hora de clase");
    }else if(timeNow < assistTime){
      attendance.attendance.find(a => a.student == student_id).attendance = 1;
    }else{
      attendance.attendance.find(a => a.student == student_id).attendance = 2;
    }

    clase.assist_code = generateCode(15);

    await clase.save();
    await attendance.save();
    
    broadcastToClients({
      action: 'attendance_updated',
      status: 'success',
    })
    
    res.status(200).json({message: 'Asistencia marcada'});

  } catch (error) {
    res.status(500).json({message: error.message})
    console.error(error)
  }
})

router.post('/unsubscribe/:class_id', async (req, res) => {
  const { class_id } = req.params;
  const { student_id } = req.body;
  try {
    const clase = await Class.findById(class_id);
    const student = await User.findById(student_id);

    student.classes = student.classes.filter((clase) => clase != class_id )
    clase.students = clase.students.filter((student) => student != student_id);
    
    const clearAttendances = await Attendance.updateMany(
      {'attendance.student': new mongoose.Types.ObjectId(student_id)},
      {$pull: {attendance: {student: new mongoose.Types.ObjectId(student_id)}}}
    );

    student.notifications.unshift({
      title: `Fuiste dado de baja de una clase`,
      message: `Has sido dado de baja de la clase ${clase.name}`
    })

    await student.save();
    await clase.save()

    res.status(200).json(
      {message: `El estudiante ${student.name} se dio de baja correctamente`}
    )
  } catch(error){
    res.status(500).json({message: error.message})
    console.error(error)
  }
});

router.post('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, semester_id } = req.body;

    const clase = await Class.findByIdAndUpdate(
      id, {name: name, semester: semester_id}, {new: true}
    );
    res.json({message: `Clase ${clase.name} actualizada`});
  } catch (error) {
    res.status(500).json({message: error.message})
    console.error(error)
  }
});

router.get('/attendances/:class_id', async (req, res) => {
  try {
    const { class_id } = req.params;

    const clase = await Class.findById(class_id).populate('students');
    const attendances = await Attendance.find({class: class_id})
    const students = clase.students.sort(
      (a, b) => a.last_name.localeCompare(b.last_name)
    );
    const attndcs = attendances.filter(
      att => new Date(`${att.day} `) <= new Date()
    );

    const flatAttendances = attndcs.flatMap(att => att.attendance);

    var response = {
      students: students.map(student => student.name),
      asistencias: [],
      retardos: [],
      faltas: []
    }

    for(student of students){
      const studentAttendances = flatAttendances.filter(
        att => att.student.toString() == student._id.toString()
      );
      
      const asistencias = studentAttendances.filter(
        att => att.attendance == 1
      ).length
      const retardos = studentAttendances.filter(
        att => att.attendance == 2
      ).length
      const faltas = studentAttendances.filter(
        att => att.attendance == 0
      ).length
      
      response.asistencias.push(asistencias);
      response.retardos.push(retardos);
      response.faltas.push(faltas);
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({message: error.message})
    console.error(error)
  }
});

router.get('/attendances-student/:class_id/:student_id', async (req, res) => {
  try{
    const { class_id, student_id } = req.params;

    const attendances = await Attendance.find({
      class: class_id
    });
    const attFlat = attendances.flatMap(att => att.attendance)
      .filter(att => att.student == student_id)
    


    res.json([
      attFlat.filter(att => att.attendance == 1).length,
      attFlat.filter(att => att.attendance == 2).length,
      attFlat.filter(att => att.attendance == 0).length,
    ])
    
  }catch(error){
    res.status(500).json({message: error.message})
    console.error(error);
  }
});

router.get('/teacher/:teacher_id', async (req, res) => {
  try {
    const { teacher_id } = req.params;

    const classes = await Class.find({teacher: teacher_id})
    res.json(classes)

  } catch (error) {
    console.error(error)
    res.status(500).json({message: error.message})
  }
});

router.get('/student/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;

    const classes = await Class.find({students: student_id});

    res.json(classes)

  } catch (error) {
    console.error(error)
    res.status(500).json({message: error.message})
  }
});

router.get('/students/:class_id', async (req, res) => {
  try {
    const { class_id } = req.params;

    const clase = await Class.findById(class_id).populate('students');
    res.json(clase.students)

  } catch (error) {
    console.error(error)
    res.status(500).json({message: error.message})
  }
});

module.exports = router;

//* Funciones

async function createAttendances(startD, endD, days, schedules, clase){
  // console.log(start, end, days, clase);
  var start = new Date(startD +" ");
  var end = new Date(endD + " ");
  var date = start;
  var attendances = [];
  while(date <= end){
    const day = date.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
    if(days.includes(day)){
      attendances.push({
        day: date.toISOString().split('T')[0],
        schedule: schedules[days.indexOf(day)]._id,
        class: clase,
        attendance: []
      });
    }
    date.setDate(date.getDate() + 1);
  }
  // console.log(attendances);
  return attendances;
}

function generateCode(n){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var code = ''

  for(var i = 0; i < n; i++ ){
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code
}