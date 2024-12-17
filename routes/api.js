const router = require('express').Router();

router.use('/semesters', require('./api/semesters.js'));
router.use('/users', require('./api/users.js'));
router.use('/login', require('./api/login'));
router.use('/classes', require('./api/classes'));
router.use('/attendance', require('./api/attendance'));

module.exports = router;