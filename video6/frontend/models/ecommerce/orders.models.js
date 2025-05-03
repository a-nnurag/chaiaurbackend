import mongoose from "mongoose";

//mini schema for order items
// this is used to store the product id of the product in the order
//this could be imported from another file but for since no one else is using it we will keep it here
const orderItemSchema= new mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
    },
    quantity:{
        type:Number,
        required:true,
    }, 
});


const  orderSchema = new mongoose.Schema({
    orderPrice:{
        type:Number,
        required:true,
    },
    customer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    orderItems:{
        type:[orderItemSchema]
    },
    address:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        enum:["pending","shipped","delivered","cancelled"],
        default:"pending",
    }
},{timestamps:true});

export const Order = mongoose.model("Order", orderSchema);