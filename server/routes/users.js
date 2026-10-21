import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import User from '../models/User.js';
import {
  auth,
  role
} from '../middleware/auth.js';


const r = Router();


/* =========================================================
   UPLOAD DIRECTORY
========================================================= */

const uploadsDir = path.resolve(
  'uploads'
);

fs.mkdirSync(
  uploadsDir,
  {
    recursive: true
  }
);


/* =========================================================
   PROFILE IMAGE UPLOAD
========================================================= */

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);


const imageStorage =
  multer.diskStorage({
    destination: (
      _req,
      _file,
      cb
    ) => {
      cb(
        null,
        uploadsDir
      );
    },

    filename: (
      _req,
      file,
      cb
    ) => {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      const safeExtension =
        ['.jpg', '.jpeg', '.png', '.webp']
          .includes(extension)
          ? extension
          : '.bin';

      const randomPart =
        Math.random()
          .toString(36)
          .slice(2, 12);

      cb(
        null,
        `profile-${Date.now()}-${randomPart}${safeExtension}`
      );
    }
  });


const imageUpload =
  multer({
    storage: imageStorage,

    limits: {
      fileSize:
        3 * 1024 * 1024
    },

    fileFilter: (
      _req,
      file,
      cb
    ) => {
      if (
        !allowedImageTypes.has(
          file.mimetype
        )
      ) {
        return cb(
          new Error(
            'Only JPG, PNG and WebP images are allowed.'
          )
        );
      }

      cb(null, true);
    }
  });


/* =========================================================
   HELPERS
========================================================= */

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profileImage:
      user.profileImage || '',
    addresses:
      user.addresses || [],
    wishlist:
      user.wishlist || []
  };
}


function cleanString(
  value,
  maxLength = 160
) {
  if (
    typeof value !==
    'string'
  ) {
    return '';
  }

  return value
    .trim()
    .slice(0, maxLength);
}


function cleanAddress(body = {}) {
  return {
    label:
      cleanString(
        body.label ||
        'Home',
        30
      ) || 'Home',

    name:
      cleanString(
        body.name,
        80
      ),

    phone:
      cleanString(
        body.phone,
        20
      ),

    line1:
      cleanString(
        body.line1,
        180
      ),

    area:
      cleanString(
        body.area,
        100
      ),

    city:
      cleanString(
        body.city,
        80
      ),

    state:
      cleanString(
        body.state,
        80
      ),

    pincode:
      cleanString(
        body.pincode,
        10
      ),

    default:
      body.default === true
  };
}


function validAddress(address) {
  return Boolean(
    address.line1 &&
    address.city &&
    address.state &&
    address.pincode
  );
}


/* Prevent deleting a similarly-named directory. */
function removeProfileFile(
  profileImage
) {
  if (
    !profileImage ||
    typeof profileImage !==
      'string' ||
    !profileImage.startsWith(
      '/uploads/'
    )
  ) {
    return;
  }

  const filename =
    path.basename(
      profileImage
    );

  const target =
    path.resolve(
      uploadsDir,
      filename
    );

  const relative =
    path.relative(
      uploadsDir,
      target
    );

  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return;
  }

  if (
    fs.existsSync(target) &&
    fs.statSync(target).isFile()
  ) {
    fs.unlinkSync(target);
  }
}


/* =========================================================
   GET CURRENT USER
========================================================= */

r.get(
  '/me',
  auth,
  async (req, res) => {
    try {
      const user =
        await User
          .findById(
            req.user.id
          )
          .populate(
            'wishlist'
          );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }

      res.json(
        publicUser(user)
      );

    } catch (error) {
      console.error(
        'GET /users/me:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to load your account.'
        });
    }
  }
);


/* =========================================================
   UPDATE PROFILE
   CURRENT PASSWORD REQUIRED
========================================================= */

r.put(
  '/me',
  auth,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }

      const currentPassword =
        typeof req.body.currentPassword ===
        'string'
          ? req.body.currentPassword
          : '';

      if (!currentPassword) {
        return res
          .status(400)
          .json({
            message:
              'Current password is required.'
          });
      }

      const passwordMatches =
        await bcrypt.compare(
          currentPassword,
          user.password
        );

      if (!passwordMatches) {
        return res
          .status(400)
          .json({
            message:
              'Current password is incorrect.'
          });
      }


      /* Only these fields can be changed. */

      const name =
        cleanString(
          req.body.name,
          80
        );

      const phone =
        cleanString(
          req.body.phone,
          20
        );

      const email =
        cleanString(
          req.body.email,
          160
        ).toLowerCase();


      if (!name) {
        return res
          .status(400)
          .json({
            message:
              'Name is required.'
          });
      }


      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Enter a valid email address.'
          });
      }


      if (
        email !==
        user.email
      ) {
        const existing =
          await User.findOne({
            email,
            _id: {
              $ne: user._id
            }
          });

        if (existing) {
          return res
            .status(409)
            .json({
              message:
                'Email is already in use.'
            });
        }
      }


      user.name =
        name;

      user.phone =
        phone;

      user.email =
        email;


      await user.save();


      res.json(
        publicUser(user)
      );

    } catch (error) {
      console.error(
        'PUT /users/me:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to update your profile.'
        });
    }
  }
);


/* =========================================================
   PROFILE IMAGE UPLOAD
========================================================= */

r.post(
  '/me/profile-image',
  auth,
  (req, res, next) => {
    imageUpload.single(
      'image'
    )(req, res, (error) => {

      if (error) {
        return res
          .status(400)
          .json({
            message:
              error.message ||
              'Profile image upload failed.'
          });
      }

      next();
    });
  },

  async (req, res) => {
    try {

      if (!req.file) {
        return res
          .status(400)
          .json({
            message:
              'Please select a JPG, PNG or WebP image up to 3 MB.'
          });
      }


      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {

        if (
          fs.existsSync(
            req.file.path
          )
        ) {
          fs.unlinkSync(
            req.file.path
          );
        }

        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const oldImage =
        user.profileImage;


      user.profileImage =
        `/uploads/${req.file.filename}`;


      await user.save();


      /*
       * Delete old image only after
       * the database update succeeds.
       */

      if (
        oldImage &&
        oldImage !==
          user.profileImage
      ) {
        removeProfileFile(
          oldImage
        );
      }


      res.json({
        profileImage:
          user.profileImage
      });

    } catch (error) {

      if (
        req.file?.path &&
        fs.existsSync(
          req.file.path
        )
      ) {
        fs.unlinkSync(
          req.file.path
        );
      }

      console.error(
        'POST /users/me/profile-image:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to update profile image.'
        });
    }
  }
);


/* =========================================================
   REMOVE PROFILE IMAGE
========================================================= */

r.delete(
  '/me/profile-image',
  auth,
  async (req, res) => {
    try {

      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const oldImage =
        user.profileImage;


      user.profileImage =
        '';

      await user.save();


      if (oldImage) {
        removeProfileFile(
          oldImage
        );
      }


      res.json({
        profileImage: ''
      });

    } catch (error) {

      console.error(
        'DELETE /users/me/profile-image:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to remove profile image.'
        });
    }
  }
);


/* =========================================================
   ADD ADDRESS
========================================================= */

r.post(
  '/me/addresses',
  auth,
  async (req, res) => {
    try {

      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const address =
        cleanAddress(
          req.body
        );


      if (
        !validAddress(
          address
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Address line, city, state and pincode are required.'
          });
      }


      const shouldBeDefault =
        address.default ||
        user.addresses.length === 0;


      if (shouldBeDefault) {
        user.addresses.forEach(
          item => {
            item.default =
              false;
          }
        );
      }


      address.default =
        shouldBeDefault;


      user.addresses.push(
        address
      );


      await user.save();


      res
        .status(201)
        .json(
          user.addresses
        );

    } catch (error) {

      console.error(
        'POST /users/me/addresses:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to add address.'
        });
    }
  }
);


/* =========================================================
   EDIT ADDRESS
========================================================= */

r.put(
  '/me/addresses/:addressId',
  auth,
  async (req, res) => {
    try {

      const {
        addressId
      } = req.params;


      if (
        !mongoose.isValidObjectId(
          addressId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid address.'
          });
      }


      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const address =
        user.addresses.id(
          addressId
        );


      if (!address) {
        return res
          .status(404)
          .json({
            message:
              'Address not found.'
          });
      }


      const next =
        cleanAddress(
          req.body
        );


      if (
        !validAddress(
          next
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Address line, city, state and pincode are required.'
          });
      }


      Object.assign(
        address,
        next
      );


      if (next.default) {
        user.addresses.forEach(
          item => {
            item.default =
              String(item._id) ===
              String(addressId);
          }
        );
      } else if (
        address.default
      ) {
        /*
         * Never allow an account
         * to end up without a
         * default address when
         * the edited address was
         * previously default.
         */
        user.addresses.forEach(
          item => {
            item.default =
              String(item._id) ===
              String(addressId);
          }
        );
      }


      await user.save();


      res.json(
        user.addresses
      );

    } catch (error) {

      console.error(
        'PUT /users/me/addresses:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to update address.'
        });
    }
  }
);


/* =========================================================
   DELETE ADDRESS
========================================================= */

r.delete(
  '/me/addresses/:addressId',
  auth,
  async (req, res) => {
    try {

      const {
        addressId
      } = req.params;


      if (
        !mongoose.isValidObjectId(
          addressId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid address.'
          });
      }


      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const address =
        user.addresses.id(
          addressId
        );


      if (!address) {
        return res
          .status(404)
          .json({
            message:
              'Address not found.'
          });
      }


      const wasDefault =
        Boolean(
          address.default
        );


      address.deleteOne();


      if (
        wasDefault &&
        user.addresses.length
      ) {
        user.addresses.forEach(
          item => {
            item.default =
              false;
          }
        );

        user.addresses[0].default =
          true;
      }


      await user.save();


      res.json(
        user.addresses
      );

    } catch (error) {

      console.error(
        'DELETE /users/me/addresses:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to delete address.'
        });
    }
  }
);


/* =========================================================
   SET DEFAULT ADDRESS
========================================================= */

r.put(
  '/me/addresses/:addressId/default',
  auth,
  async (req, res) => {
    try {

      const {
        addressId
      } = req.params;


      if (
        !mongoose.isValidObjectId(
          addressId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid address.'
          });
      }


      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const address =
        user.addresses.id(
          addressId
        );


      if (!address) {
        return res
          .status(404)
          .json({
            message:
              'Address not found.'
          });
      }


      user.addresses.forEach(
        item => {
          item.default =
            String(item._id) ===
            String(addressId);
        }
      );


      await user.save();


      res.json(
        user.addresses
      );

    } catch (error) {

      console.error(
        'PUT /users/me/addresses/:addressId/default:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to change default address.'
        });
    }
  }
);


/* =========================================================
   CHANGE PASSWORD
========================================================= */

r.put(
  '/me/password',
  auth,
  async (req, res) => {
    try {

      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const current =
        typeof req.body.current ===
        'string'
          ? req.body.current
          : '';

      const next =
        typeof req.body.next ===
        'string'
          ? req.body.next
          : '';


      const matches =
        await bcrypt.compare(
          current,
          user.password
        );


      if (!matches) {
        return res
          .status(400)
          .json({
            message:
              'Current password is incorrect.'
          });
      }


      if (
        next.length < 6
      ) {
        return res
          .status(400)
          .json({
            message:
              'New password must be at least 6 characters.'
          });
      }


      user.password =
        await bcrypt.hash(
          next,
          12
        );


      await user.save();


      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        'PUT /users/me/password:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to change password.'
        });
    }
  }
);


/* =========================================================
   DELETE ACCOUNT
========================================================= */

r.delete(
  '/me',
  auth,
  async (req, res) => {
    try {

      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      if (
        user.profileImage
      ) {
        removeProfileFile(
          user.profileImage
        );
      }


      await User.findByIdAndDelete(
        req.user.id
      );


      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        'DELETE /users/me:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to delete account.'
        });
    }
  }
);


/* =========================================================
   ADMIN PASSWORD
========================================================= */

r.put(
  '/admin/password',
  auth,
  role('admin'),
  async (req, res) => {
    try {

      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User account not found.'
          });
      }


      const matches =
        await bcrypt.compare(
          req.body.current || '',
          user.password
        );


      if (!matches) {
        return res
          .status(400)
          .json({
            message:
              'Current password is incorrect.'
          });
      }


      if (
        !req.body.next ||
        req.body.next.length < 6
      ) {
        return res
          .status(400)
          .json({
            message:
              'New password must be at least 6 characters.'
          });
      }


      user.password =
        await bcrypt.hash(
          req.body.next,
          12
        );


      await user.save();


      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        'PUT /users/admin/password:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to change password.'
        });
    }
  }
);


/* =========================================================
   ADMIN CUSTOMER LIST
========================================================= */

r.get(
  '/',
  auth,
  role('admin'),
  async (_req, res) => {
    try {

      const users =
        await User
          .find({
            role: 'customer'
          })
          .select('-password')
          .sort({
            createdAt: -1
          });

      res.json(users);

    } catch (error) {

      console.error(
        'GET /users:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to load customers.'
        });
    }
  }
);


export default r;