import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},items:[{product:{type:mongoose.Schema.Types.ObjectId,ref:'Product'},name:String,image:String,price:Number,quantity:Number}],subtotal:Number,shipping:Number,total:Number,address:mongoose.Schema.Types.Mixed,status:{type:String,enum:['Placed','Processing','Shipped','Out for Delivery','Delivered','Cancelled'],default:'Placed'},deliveryDate:Date,history:[{status:String,at:Date}]},{timestamps:true});
export default mongoose.model('Order',schema);
