const mongoose = require('mongoose');

const connectToDB = async () => {
    try{
        console.log('connecting to database...');

        await mongoose.connect(process.env.MONGO_URI);

        console.log('database connected!');
        
    }catch(err){
        console.error(`database connection failed! `, err);
        process.exit(1);
    }
}

module.exports = connectToDB;