import { Router } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import {
  auth,
  role
} from '../middleware/auth.js';

const r = Router();


/*
|--------------------------------------------------------------------------
| CUSTOMER — CREATE ORDER
|--------------------------------------------------------------------------
*/

r.post(
  '/',
  auth,
  async (req, res) => {

    try {

      if (
        req.user.role !==
        'customer'
      ) {
        return res
          .status(403)
          .json({
            message:
              'Customers only.'
          });
      }


      const {
        items,
        address
      } = req.body;


      if (
        !Array.isArray(items) ||
        !items.length
      ) {
        return res
          .status(400)
          .json({
            message:
              'Cart is empty.'
          });
      }


      const ids =
        items.map(
          item => item.product
        );


      const products =
        await Product.find({
          _id: {
            $in: ids
          }
        });


      const productMap =
        new Map(
          products.map(
            product => [
              String(product._id),
              product
            ]
          )
        );


      const normalized = [];

      let subtotal = 0;


      for (
        const item of items
      ) {

        const product =
          productMap.get(
            String(
              item.product
            )
          );


        if (!product) {
          return res
            .status(400)
            .json({
              message:
                'A product is unavailable.'
            });
        }


        const quantity =
          Number(
            item.quantity
          );


        if (
          !Number.isInteger(
            quantity
          ) ||
          quantity <= 0
        ) {
          return res
            .status(400)
            .json({
              message:
                'Invalid product quantity.'
            });
        }


        if (
          product.stock <
          quantity
        ) {
          return res
            .status(400)
            .json({
              message:
                `Only ${product.stock} of ${product.name} are available.`
            });
        }


        normalized.push({
          product:
            product._id,

          name:
            product.name,

          image:
            product.images?.[0] ||
            '',

          price:
            product.price,

          quantity
        });


        subtotal +=
          product.price *
          quantity;
      }


      /*
       * Decrease stock.
       */
      for (
        const item of normalized
      ) {

        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock:
                -item.quantity
            }
          }
        );

      }


      const now =
        new Date();


      const delivery =
        new Date(now);


      delivery.setDate(
        delivery.getDate() + 7
      );


      const shipping =
        subtotal >= 999
          ? 0
          : 79;


      const order =
        await Order.create({

          user:
            req.user.id,

          items:
            normalized,

          subtotal,

          shipping,

          total:
            subtotal +
            shipping,

          address,

          status:
            'Placed',

          deliveryDate:
            delivery,

          history: [
            {
              status:
                'Placed',

              at:
                now
            }
          ]

        });


      res
        .status(201)
        .json(
          await order.populate(
            'user',
            'name email'
          )
        );

    } catch (error) {

      console.error(
        'Create order error:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to create order.'
        });
    }
  }
);


/*
|--------------------------------------------------------------------------
| CUSTOMER — GET MY ORDERS
|--------------------------------------------------------------------------
*/

r.get(
  '/me',
  auth,
  async (req, res) => {

    try {

      if (
        req.user.role !==
        'customer'
      ) {
        return res
          .status(403)
          .json({
            message:
              'Customers only.'
          });
      }


      const orders =
        await Order.find({
          user:
            req.user.id
        })
        .sort({
          createdAt:
            -1
        });


      res.json(
        orders
      );

    } catch (error) {

      console.error(
        'Get customer orders error:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to load orders.'
        });
    }
  }
);


/*
|--------------------------------------------------------------------------
| CUSTOMER — CANCEL ORDER
|--------------------------------------------------------------------------
|
| Only the owner of the order can
| cancel it.
|
| Cancellation is allowed only when
| status is:
|
|   Placed
|   Processing
|
| Shipped / Out for Delivery /
| Delivered cannot be cancelled by
| the customer.
|
| Product stock is restored after
| successful cancellation.
|--------------------------------------------------------------------------
*/

r.put(
  '/:id/cancel',
  auth,
  async (req, res) => {

    try {

      if (
        req.user.role !==
        'customer'
      ) {
        return res
          .status(403)
          .json({
            message:
              'Customers only.'
          });
      }


      /*
       * Find only an order belonging
       * to the currently logged-in
       * customer.
       *
       * The status condition also
       * prevents cancelling the same
       * order twice.
       */
      const order =
        await Order.findOne({
          _id:
            req.params.id,

          user:
            req.user.id,

          status: {
            $in: [
              'Placed',
              'Processing'
            ]
          }
        });


      if (!order) {

        return res
          .status(400)
          .json({
            message:
              'This order cannot be cancelled. It may already be cancelled or has already been shipped.'
          });
      }


      /*
       * Restore stock.
       */
      for (
        const item of order.items
      ) {

        if (
          item.product
        ) {

          await Product.findByIdAndUpdate(
            item.product,
            {
              $inc: {
                stock:
                  item.quantity
              }
            }
          );

        }
      }


      /*
       * Change status.
       */
      order.status =
        'Cancelled';


      /*
       * Preserve the cancellation
       * in the status history.
       */
      order.history.push({
        status:
          'Cancelled',

        at:
          new Date()
      });


      await order.save();


      res.json(
        order
      );

    } catch (error) {

      console.error(
        'Cancel order error:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to cancel order.'
        });
    }
  }
);


/*
|--------------------------------------------------------------------------
| CUSTOMER — REMOVE CANCELLED ORDER RECORD
|--------------------------------------------------------------------------
|
| Important security rules:
|
| 1. Customer must be authenticated.
| 2. Customer must own the order.
| 3. Order must already be Cancelled.
|
| A customer cannot delete:
| - another customer's order
| - a placed order
| - a processing order
| - a shipped order
| - a delivered order
|--------------------------------------------------------------------------
*/

r.delete(
  '/:id',
  auth,
  async (req, res) => {

    try {

      if (
        req.user.role !==
        'customer'
      ) {
        return res
          .status(403)
          .json({
            message:
              'Customers only.'
          });
      }


      const order =
        await Order.findOne({
          _id:
            req.params.id,

          user:
            req.user.id,

          status:
            'Cancelled'
        });


      if (!order) {

        return res
          .status(400)
          .json({
            message:
              'Only your cancelled orders can be removed.'
          });
      }


      await Order.deleteOne({
        _id:
          order._id,

        user:
          req.user.id,

        status:
          'Cancelled'
      });


      res.json({
        success:
          true,

        message:
          'Cancelled order record removed.'
      });

    } catch (error) {

      console.error(
        'Remove order error:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to remove order record.'
        });
    }
  }
);


/*
|--------------------------------------------------------------------------
| ADMIN — ORDER NOTIFICATION COUNT
|--------------------------------------------------------------------------
*/

r.get(
  '/notifications',
  auth,
  role('admin'),
  async (_, res) => {

    res.json({
      count:
        await Order.countDocuments({
          status:
            'Placed'
        })
    });

  }
);


/*
|--------------------------------------------------------------------------
| ADMIN — MARK NOTIFICATIONS AS READ
|--------------------------------------------------------------------------
*/

r.put(
  '/read-all',
  auth,
  role('admin'),
  async (_, res) => {

    res.json({
      ok:
        true
    });

  }
);


/*
|--------------------------------------------------------------------------
| ADMIN — GET ALL ORDERS
|--------------------------------------------------------------------------
*/

r.get(
  '/',
  auth,
  role('admin'),
  async (_, res) => {

    try {

      const orders =
        await Order.find()
          .populate(
            'user',
            'name email phone'
          )
          .sort({
            createdAt:
              -1
          });


      res.json(
        orders
      );

    } catch (error) {

      console.error(
        'Admin orders error:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to load orders.'
        });
    }
  }
);


/*
|--------------------------------------------------------------------------
| ADMIN — CHANGE ORDER STATUS
|--------------------------------------------------------------------------
*/

r.put(
  '/:id/status',
  auth,
  role('admin'),
  async (req, res) => {

    try {

      const allowedStatuses = [
        'Placed',
        'Processing',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled'
      ];


      const newStatus =
        req.body.status;


      if (
        !allowedStatuses.includes(
          newStatus
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid order status.'
          });
      }


      const order =
        await Order.findById(
          req.params.id
        );


      if (!order) {

        return res
          .status(404)
          .json({
            message:
              'Order not found.'
          });
      }


      /*
       * Do nothing if the status
       * has not changed.
       */
      if (
        order.status ===
        newStatus
      ) {
        return res.json(
          order
        );
      }


      /*
       * If admin cancels an order,
       * restore product stock.
       *
       * This prevents stock from being
       * permanently reduced when an
       * administrator cancels an order.
       */
      if (
        newStatus ===
        'Cancelled' &&
        order.status !==
        'Cancelled'
      ) {

        for (
          const item of order.items
        ) {

          if (
            item.product
          ) {

            await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  stock:
                    item.quantity
                }
              }
            );

          }
        }
      }


      /*
       * If an already-cancelled order
       * is being changed back to an
       * active status, deduct stock
       * again.
       */
      if (
        order.status ===
        'Cancelled' &&
        newStatus !==
        'Cancelled'
      ) {

        for (
          const item of order.items
        ) {

          if (
            item.product
          ) {

            const product =
              await Product.findById(
                item.product
              );


            if (!product) {
              return res
                .status(400)
                .json({
                  message:
                    `Product for "${item.name}" is no longer available.`
                });
            }


            if (
              product.stock <
              item.quantity
            ) {
              return res
                .status(400)
                .json({
                  message:
                    `Not enough stock to reactivate "${item.name}".`
                });
            }


            await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  stock:
                    -item.quantity
                }
              }
            );

          }
        }
      }


      order.status =
        newStatus;


      order.history.push({
        status:
          newStatus,

        at:
          new Date()
      });


      await order.save();


      res.json(
        order
      );

    } catch (error) {

      console.error(
        'Update order status error:',
        error
      );

      res
        .status(500)
        .json({
          message:
            'Unable to update order status.'
        });
    }
  }
);


export default r;