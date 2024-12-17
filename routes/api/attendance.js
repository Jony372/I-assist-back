const router = require('express').Router();

const Attendance = require('../../models/attendance.model');

router.get('/:class', async (req, res) => {
  try {
    const attendances = await Attendance.find({ class: req.params.class })
      .populate('attendance.student');
    res.json(attendances);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.get('/:clase/:start/:end', async (req, res) => {
  try {
    const { clase, start, end } = req.params;

    const atts = await Attendance.find({
      class: clase,
      day: {
        $gte: start,
        $lte: end
      }
    }).populate('attendance.student');

    // const attendances = await Attendance.find({
    //   class: clase
    // }).populate('attendance.student');

    // atts = attendances.filter((att) => {
    //   day = new Date(`${att.day} `);
    //   startDay = new Date(`${start} `);
    //   endDay = new Date(`${end} `);

    //   return day >= startDay && day <= endDay;
    // })
    // console.log(start, end);
    // console.log(atts);


    res.json(atts);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.post('/set/:id', async (req, res) => {
  try {
    const {id} = req.params;
    const {att, attId} = req.body;

    const att2 = await Attendance.findById(id);
    // console.log(att2);
    

    const attendance = await Attendance.findByIdAndUpdate(id,{
      $set: { "attendance.$[elem].attendance": att }
        },
        {
          arrayFilters: [{ "elem._id": attId }], // Filtro para encontrar el objeto en el array
          new: true // Retorna el documento actualizado
        }
      ).then(() => {
      res.status(201).json({
        message: 'Asistencia marcada correctamente'
      });
    }).catch((err) => {
      // console.log(err)
      throw new Error("Error al marcar la asistencia");
    });
      
  } catch (err) {
    console.log(err)
    res.status(400).json({ message: err.message });
  }
})

module.exports = router;