const router = require('express').Router();

const Semester = require('../../models/semester.model.js');

router.get('/', async (req, res) => {
  try {
    const semesters = await Semester.find();
    res.json(semesters);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const semester = await Semester.findById(id);
    res.json(semester);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

router.post('/', async (req, res) => {
  try {
    const semester = await Semester.create(req.body);
    res.json(semester);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

module.exports = router;