const express = require('express');
const cors = require('cors');
const path = require('path')

require('dotenv').config();
require('./config/db.js');

const app = express();

//* Config
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', require('./routes/api.js'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})



app.use('/api/uploads', express.static(path.join(__dirname, './assets/profile_pictures')));