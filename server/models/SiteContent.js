import mongoose from 'mongoose';
const schema=new mongoose.Schema({key:{type:String,unique:true},value:mongoose.Schema.Types.Mixed},{timestamps:true});
export default mongoose.model('SiteContent',schema);
