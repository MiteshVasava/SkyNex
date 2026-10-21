import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true,unique:true},image:String,active:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Category',schema);
