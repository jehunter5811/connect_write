const express = require('express');
const connectDB = require('./config/db');
const fileUpload = require('express-fileupload');
const config = require('config');

const app = express();

app.use(fileUpload());

//  Connect Database
connectDB(config.get('environment'));

//  Init Middleware
app.use(express.json({ extended: false }));

app.get('/', (req, res) => res.send("API Running"));

//  Define Routes
app.use('/v1/users', require('./routes/v1/users'));
app.use('/v1/auth', require('./routes/v1/auth'));
app.use('/v1/posts', require('./routes/v1/posts'));
app.use('/v1/profile', require('./routes/v1/profile'));
app.use('/v1/submissions', require('./routes/v1/submissions'));
app.use('/v1/uploads', require('./routes/v1/uploads'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
});