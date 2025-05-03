import mongoose from 'mongoose';

const userSchema= new mongoose.Schema({
    userName:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    }, 
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
    },
    password:{
        type:String,
        required:true,    
    }
},{timestamps:true});

const User= mongoose.model('User',userSchema);