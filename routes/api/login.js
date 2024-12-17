const router = require('express').Router();

const User = require('../../models/user.model');

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email }).populate('classes');
    if (user) {
      if (user.password !== password) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }else{
        const { password, ...rest } = user._doc;
        res.json(rest)
      }
    }else{
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

module.exports = router;