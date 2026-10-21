import { useEffect, useState } from 'react';
import { api } from '../api';

const ORDER_STATUSES = [
  'Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered'
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /*
   * Load customer's orders.
   */
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await api('/orders/me');

      setOrders(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (e) {
      setError(
        e.message || 'Unable to load orders.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);


  /*
   * Cancel an order.
   *
   * The server verifies that:
   * - the customer owns the order
   * - the order is still cancellable
   *
   * Product stock is restored by the server.
   */
  const cancelOrder = async (orderId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this order?\n\nThe order will be marked as Cancelled and the product stock will be restored.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(orderId);
      setError('');
      setMessage('');

      const updatedOrder = await api(
        `/orders/${orderId}/cancel`,
        {
          method: 'PUT'
        }
      );

      setOrders(prev =>
        prev.map(order =>
          order._id === updatedOrder._id
            ? updatedOrder
            : order
        )
      );

      setMessage(
        'Order cancelled successfully.'
      );
    } catch (e) {
      setError(
        e.message || 'Unable to cancel the order.'
      );
    } finally {
      setBusyId('');
    }
  };


  /*
   * Permanently remove a cancelled
   * order record from the customer's
   * order history.
   *
   * Server only permits deletion when:
   * - customer owns the order
   * - status is Cancelled
   */
  const removeOrderRecord = async (orderId) => {
    const confirmed = window.confirm(
      'Remove this cancelled order record from your order history?\n\nThis action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(orderId);
      setError('');
      setMessage('');

      await api(
        `/orders/${orderId}`,
        {
          method: 'DELETE'
        }
      );

      setOrders(prev =>
        prev.filter(
          order =>
            order._id !== orderId
        )
      );

      setMessage(
        'Cancelled order record removed.'
      );
    } catch (e) {
      setError(
        e.message ||
        'Unable to remove the order record.'
      );
    } finally {
      setBusyId('');
    }
  };


  /*
   * Determine whether the customer
   * can cancel the order.
   *
   * Customer cancellation is allowed
   * only while the order is Placed
   * or Processing.
   */
  const canCancel = (status) => {
    return (
      status === 'Placed' ||
      status === 'Processing'
    );
  };


  const formatDate = (date) => {
    if (!date) {
      return '—';
    }

    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );
  };


  const getOrderClass = (status) => {
    return String(status || '')
      .toLowerCase()
      .replaceAll(' ', '-');
  };


  return (
    <main className="page">

      <div className="page-title">

        <div>
          <span className="eyebrow">
            ACCOUNT
          </span>

          <h1>
            My Orders
          </h1>

          <p>
            Track your purchases and delivery progress.
          </p>
        </div>

      </div>


      {/* Success message */}

      {message && (
        <div className="notice order-message">
          {message}
        </div>
      )}


      {/* Error message */}

      {error && (
        <div className="error order-message">
          {error}
        </div>
      )}


      {/* Loading */}

      {loading && (
        <div className="empty">
          <p>
            Loading your orders…
          </p>
        </div>
      )}


      {/* Orders */}

      {!loading &&
        orders.map(order => {

          const isCancelled =
            order.status === 'Cancelled';

          const isBusy =
            busyId === order._id;

          return (
            <article
              className="panel customer-order"
              key={order._id}
            >

              {/* ================================
                  ORDER HEADER
              ================================= */}

              <div className="order-top">

                <div>

                  <b>
                    Order #
                    {order._id
                      .slice(-7)
                      .toUpperCase()}
                  </b>

                  <small>
                    {formatDate(
                      order.createdAt
                    )}
                  </small>

                </div>


                <mark
                  className={
                    getOrderClass(
                      order.status
                    )
                  }
                >
                  {order.status}
                </mark>

              </div>


              {/* ================================
                  PRODUCTS
              ================================= */}

              <div className="order-products">

                {order.items?.map(
                  (item, index) => (
                    <div
                      key={
                        item.product ||
                        index
                      }
                    >

                      <img
                        src={item.image}
                        alt={item.name}
                      />

                      <span>
                        {item.name}
                        {' × '}
                        {item.quantity}
                      </span>

                      <b>
                        ₹
                        {(
                          item.price *
                          item.quantity
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </b>

                    </div>
                  )
                )}

              </div>


              {/* ================================
                  DELIVERY
              ================================= */}

              <div className="delivery">

                <span>
                  Expected delivery
                </span>

                <b>
                  {formatDate(
                    order.deliveryDate
                  )}
                </b>

              </div>


              {/* ================================
                  TIMELINE
              ================================= */}

              {!isCancelled && (
                <div className="timeline">

                  {ORDER_STATUSES.map(
                    status => (

                      <div
                        className={
                          order.history?.some(
                            history =>
                              history.status ===
                              status
                          )
                            ? 'done'
                            : ''
                        }
                        key={status}
                      >

                        <i />

                        <span>
                          {status}
                        </span>

                      </div>

                    )
                  )}

                </div>
              )}


              {/* ================================
                  CANCELLED INFORMATION
              ================================= */}

              {isCancelled && (
                <div className="cancelled-order-info">

                  <strong>
                    This order has been cancelled.
                  </strong>

                  <span>
                    The order will no longer be processed
                    or delivered.
                  </span>

                </div>
              )}


              {/* ================================
                  ORDER MANAGEMENT
              ================================= */}

              <div className="order-management">

                {canCancel(order.status) && (
                  <button
                    type="button"
                    className="order-cancel-button"
                    disabled={isBusy}
                    onClick={() =>
                      cancelOrder(
                        order._id
                      )
                    }
                  >
                    {isBusy
                      ? 'Cancelling…'
                      : 'Cancel Order'}
                  </button>
                )}


                {isCancelled && (
                  <button
                    type="button"
                    className="order-remove-button"
                    disabled={isBusy}
                    onClick={() =>
                      removeOrderRecord(
                        order._id
                      )
                    }
                  >
                    {isBusy
                      ? 'Removing…'
                      : 'Remove Record'}
                  </button>
                )}

              </div>

            </article>
          );
        })}


      {/* Empty state */}

      {!loading &&
        !orders.length && (
          <div className="empty">

            <h2>
              No orders yet
            </h2>

            <p>
              Your completed and active orders
              will appear here.
            </p>

          </div>
        )}

    </main>
  );
}