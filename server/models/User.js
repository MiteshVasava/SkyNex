import mongoose from 'mongoose';


const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: 30,
      default: 'Home'
    },

    name: {
      type: String,
      trim: true,
      maxlength: 80
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20
    },

    line1: {
      type: String,
      trim: true,
      maxlength: 180,
      required: true
    },

    area: {
      type: String,
      trim: true,
      maxlength: 100
    },

    city: {
      type: String,
      trim: true,
      maxlength: 80,
      required: true
    },

    state: {
      type: String,
      trim: true,
      maxlength: 80,
      required: true
    },

    pincode: {
      type: String,
      trim: true,
      maxlength: 10,
      required: true
    },

    default: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: true
  }
);


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: [
        'customer',
        'admin',
        'staff'
      ],
      default: 'customer'
    },

    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },

    profileImage: {
      type: String,
      default: ''
    },

    addresses: {
      type: [addressSchema],
      default: []
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ]
  },
  {
    timestamps: true
  }
);


export default mongoose.model(
  'User',
  userSchema
);