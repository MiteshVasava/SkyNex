import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true},brand:String,category:{type:String,required:true},price:{type:Number,required:true},oldPrice:Number,discount:Number,stock:{type:Number,default:0},images:[String],description:String,specifications:mongoose.Schema.Types.Mixed,featured:{type:Boolean,default:false}},{timestamps:true});
export default mongoose.model('Product',schema);
