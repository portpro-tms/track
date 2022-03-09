const mongoose = require('mongoose');
require('./models');
const dotenv = require('dotenv');
dotenv.config();
const config = require('./config');


const mongoDbConnection = async () =>{
  const clientOption = {
    socketTimeoutMS: 30000,
    keepAlive: true,
    poolSize: 50,
    useNewUrlParser: true,
    autoIndex: false,
    useUnifiedTopology: true
  };
  
  let database = await mongoose.connect(process.env.MONGO_URL, clientOption);
  return database;
}

exports.mongoDbConnection = mongoDbConnection;