const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = require('express').Router();

const User = require('../../models/user.model');
const sharp = require('sharp');
const { profile } = require('console');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { id } = req.params;
    if (!id) {
      return cb(new Error('El parámetro ID es requerido.'));
    }
    const uploadDir = path.join(__dirname, '../../assets/profile_pictures', id); // Carpeta donde guardarás las imágenes
    // Crear la carpeta si no existe
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}${path.extname(file.originalname)}`;

    cb(null, fileName);
  }
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const users = await User.find().where({is_active: true});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).populate('classes')
    .populate({
      path: 'classes',
      populate: { path: 'semester' }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

router.get('/students/ids', async (req, res) => {
  try {
    const students = await User.find({is_teacher: false})
      .where({is_active: true});
    results = students.map(student => student._id)
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    user.notifications.unshift({
      title: "Bienvenido",
      message: `Bienvenido/a a la plataforma ${user.name}`
    });
    res.json(user);
  } catch (err) {
    const code = err.errorResponse.code
    if(code === 11000){
      const PAT = err.errorResponse.keyPattern
      if ("email" in PAT) {
        res.status(400).json({ message: "El correo ya esta en uso" });
      }else {
        res.status(400).json({ message: "El número de control ya esta en uso" });
      }
    }else{
      res.status(500).json({ message: err.message });
      console.log(err);
    }
  }
})

router.post('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByIdAndUpdate(
      id, {is_active: false}, {new: true}
    );
    const classes = user.classes;

    classes.forEach(async (class_id) => {
      await User.updateMany(
        {classes: class_id},
        {$pull: {classes: class_id}}
      );
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

router.post('/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, last_name, birthdate, email, phone } = req.body;
    // const { file } = req.file;

    // let filePath;
    let profilePicturePath
    if (req.file) {
      const originalPath = req.file.path; // Ruta del archivo subido
      const resizedPath = originalPath.replace(
        /(\.\w+)$/, '_80x80'
      ) + path.extname(originalPath); // Nombre para la imagen redimensionada

      // Redimensionar la imagen a una ruta diferente
      await sharp(originalPath)
        .resize(80, 80)
        .toFile(resizedPath);


      // Guardar la ruta final en la base de datos
      profilePicturePath = `/uploads/${id}/${req.file.filename.replace(
        /(\.\w+)$/, '_80x80'
      )}${path.extname(originalPath)}`;
    }

    const user = await User.findByIdAndUpdate(id, {
      name,
      last_name,
      birthdate,
      email,
      phone,
      ...(profilePicturePath && { profile_picture: profilePicturePath })
    }, {new: true});
    user.notifications.unshift({
      title: "Perfil actualizado",
      message: `Tu perfil ha sido actualizado`
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
})

router.post('/notification-read/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    const user = await User.findByIdAndUpdate(user_id, {
      $set: {
        "notifications.$[elem].is_read": true
      }
    }, {
      arrayFilters: [{ "elem._id": id }],
      new: true
    });
    

    res.json(user.notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

router.get('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.json(user.notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

//! Student
router.post('/add-class/:id', async (req, res) => {
  const { id } = req.params;
  const { class_id } = req.body;
  try {
    const user = await User.findById(id);
    user.classes.push(class_id);
    user.save();
    user.notifications.unshift({
      title: "Inscripción exitosa",
      message: `Te has inscrito a la clase`
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err);
  }
});

module.exports = router;