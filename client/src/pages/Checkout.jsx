import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

export default function Checkout() {
  const {
    cart,
    user,
    setUser
  } = useApp();

  const [addresses, setAddresses] = useState([]);

  const [selectedAddressId, setSelectedAddressId] =
    useState('');

  const [showNewAddress, setShowNewAddress] =
    useState(false);

  const [loadingAddresses, setLoadingAddresses] =
    useState(true);

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [msg, setMsg] =
    useState('');

  const [error, setError] =
    useState('');

  const [address, setAddress] = useState({
    label: 'Home',
    name: user?.name || '',
    line1: '',
    area: '',
    city: '',
    state: 'Gujarat',
    pincode: '',
    phone: user?.phone || '',
    default: false
  });


  /*
   * Load saved addresses from the
   * authenticated user's account.
   */
  useEffect(() => {
    let mounted = true;

    const loadAddresses = async () => {
      try {
        setLoadingAddresses(true);
        setError('');

        const data = await api('/users/me');

        if (!mounted) return;

        const saved =
          Array.isArray(data.addresses)
            ? data.addresses
            : [];

        setAddresses(saved);

        /*
         * Keep AppContext synchronized
         * with the latest user information.
         */
        setUser(data);

        /*
         * Automatically select the
         * default address.
         */
        const defaultAddress =
          saved.find(
            item => item.default
          );

        if (defaultAddress) {
          setSelectedAddressId(
            String(defaultAddress._id)
          );
        } else if (saved.length > 0) {
          setSelectedAddressId(
            String(saved[0]._id)
          );
        } else {
          setShowNewAddress(true);
        }

      } catch (e) {
        if (mounted) {
          setError(e.message);
        }
      } finally {
        if (mounted) {
          setLoadingAddresses(false);
        }
      }
    };

    loadAddresses();

    return () => {
      mounted = false;
    };
  }, [setUser]);


  const selectedAddress =
    addresses.find(
      item =>
        String(item._id) ===
        String(selectedAddressId)
    ) || null;


  const total = cart.reduce(
    (sum, item) =>
      sum +
      item.price *
      item.quantity,
    0
  );

  const shipping =
    total >= 999
      ? 0
      : 79;


  /*
   * Update new-address form.
   */
  const updateAddress = (
    field,
    value
  ) => {
    setAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };


  /*
   * Open new address form.
   */
  const openNewAddress = () => {
    setError('');
    setMsg('');

    setAddress({
      label: 'Home',
      name: user?.name || '',
      line1: '',
      area: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
      phone: user?.phone || '',
      default: addresses.length === 0
    });

    setShowNewAddress(true);
    setSelectedAddressId('');
  };


  /*
   * Save new address and immediately
   * make it the selected checkout address.
   */
  const saveNewAddress = async (
    event
  ) => {
    event.preventDefault();

    if (savingAddress) return;

    setSavingAddress(true);
    setError('');
    setMsg('');

    try {
      const updatedAddresses =
        await api(
          '/users/me/addresses',
          {
            method: 'POST',
            body: JSON.stringify(
              address
            )
          }
        );

      const saved =
        Array.isArray(updatedAddresses)
          ? updatedAddresses
          : [];

      setAddresses(saved);

      /*
       * Find the address that was just
       * created.
       */
      const newest =
        saved[saved.length - 1];

      if (newest?._id) {
        setSelectedAddressId(
          String(newest._id)
        );
      }

      setShowNewAddress(false);

      /*
       * Update global user state.
       */
      if (user) {
        setUser({
          ...user,
          addresses: saved
        });
      }

      setMsg(
        'Delivery address added successfully.'
      );

    } catch (e) {
      setError(e.message);
    } finally {
      setSavingAddress(false);
    }
  };


  /*
   * Place order using the selected
   * saved address.
   */
  const place = async (
    event
  ) => {
    event.preventDefault();

    if (placingOrder) return;

    setError('');
    setMsg('');

    if (!selectedAddress) {
      setError(
        'Please select a delivery address.'
      );
      return;
    }

    if (!cart.length) {
      setError(
        'Your cart is empty.'
      );
      return;
    }

    setPlacingOrder(true);

    try {
      await api(
        '/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            items: cart,
            address: {
              _id:
                selectedAddress._id,

              label:
                selectedAddress.label,

              name:
                selectedAddress.name,

              line1:
                selectedAddress.line1,

              area:
                selectedAddress.area,

              city:
                selectedAddress.city,

              state:
                selectedAddress.state,

              pincode:
                selectedAddress.pincode,

              phone:
                selectedAddress.phone
            }
          })
        }
      );

      localStorage.setItem(
        'skynex-cart',
        '[]'
      );

      /*
       * Use a normal browser navigation
       * after the server confirms the order.
       */
      window.location.href =
        '/orders';

    } catch (e) {
      setError(e.message);
      setPlacingOrder(false);
    }
  };


  return (
    <main className="page">

      <div className="page-title">

        <div>
          <span className="eyebrow">
            CHECKOUT
          </span>

          <h1>
            Complete your order
          </h1>
        </div>

      </div>


      <div className="checkout-layout">

        {/* =========================================
            DELIVERY ADDRESS
        ========================================= */}

        <form
          className="panel form-stack checkout-form"
          onSubmit={place}
        >

          <div className="checkout-section-head">

            <div>
              <h2>
                Delivery address
              </h2>

              <p>
                Select a saved address or add a new one.
              </p>
            </div>

          </div>


          {loadingAddresses ? (
            <div className="address-loading">
              Loading saved addresses…
            </div>
          ) : (
            <>
              {/* =====================================
                  SAVED ADDRESSES
              ===================================== */}

              {addresses.length > 0 && (
                <div className="checkout-address-section">

                  <div className="checkout-address-title">
                    <b>
                      Saved addresses
                    </b>

                    <button
                      type="button"
                      className="checkout-add-address"
                      onClick={openNewAddress}
                    >
                      + Add New Address
                    </button>
                  </div>


                  <div className="checkout-address-list">

                    {addresses.map(
                      item => (
                        <label
                          className={
                            `checkout-address-card ${
                              String(
                                selectedAddressId
                              ) ===
                              String(item._id)
                                ? 'selected'
                                : ''
                            }`
                          }
                          key={item._id}
                        >

                          <input
                            type="radio"
                            name="deliveryAddress"
                            value={item._id}
                            checked={
                              String(
                                selectedAddressId
                              ) ===
                              String(item._id)
                            }
                            onChange={() => {
                              setSelectedAddressId(
                                String(
                                  item._id
                                )
                              );

                              setShowNewAddress(
                                false
                              );

                              setError('');
                              setMsg('');
                            }}
                          />


                          <div className="checkout-address-content">

                            <div className="checkout-address-top">

                              <span className="checkout-address-label">
                                {item.label ||
                                  'Address'}
                              </span>

                              {item.default && (
                                <span className="checkout-default">
                                  Default
                                </span>
                              )}

                            </div>


                            <strong>
                              {item.name}
                            </strong>


                            {item.phone && (
                              <span>
                                {item.phone}
                              </span>
                            )}


                            <p>

                              {item.line1}

                              {item.area
                                ? `, ${item.area}`
                                : ''}

                              {item.city
                                ? `, ${item.city}`
                                : ''}

                              {item.state
                                ? `, ${item.state}`
                                : ''}

                              {item.pincode
                                ? ` - ${item.pincode}`
                                : ''}

                            </p>

                          </div>

                        </label>
                      )
                    )}

                  </div>

                </div>
              )}


              {/* =====================================
                  NO SAVED ADDRESS
              ===================================== */}

              {addresses.length === 0 &&
                !showNewAddress && (
                  <div className="no-checkout-address">

                    <p>
                      You don't have a saved delivery
                      address yet.
                    </p>

                    <button
                      type="button"
                      className="primary"
                      onClick={openNewAddress}
                    >
                      + Add Delivery Address
                    </button>

                  </div>
                )}


              {/* =====================================
                  NEW ADDRESS FORM
              ===================================== */}

              {showNewAddress && (
                <div className="new-checkout-address">

                  <div className="new-address-head">

                    <div>
                      <h3>
                        Add delivery address
                      </h3>

                      <p>
                        This address will be saved to
                        your account.
                      </p>
                    </div>

                    {addresses.length > 0 && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setShowNewAddress(
                            false
                          );

                          const defaultAddress =
                            addresses.find(
                              item =>
                                item.default
                            );

                          if (
                            defaultAddress
                          ) {
                            setSelectedAddressId(
                              String(
                                defaultAddress._id
                              )
                            );
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}

                  </div>


                  <div className="checkout-fields">

                    <label>
                      Address label

                      <select
                        value={
                          address.label
                        }
                        onChange={e =>
                          updateAddress(
                            'label',
                            e.target.value
                          )
                        }
                      >
                        <option value="Home">
                          Home
                        </option>

                        <option value="Work">
                          Work
                        </option>

                        <option value="Other">
                          Other
                        </option>

                      </select>
                    </label>


                    <label>
                      Full name

                      <input
                        required
                        maxLength="80"
                        value={
                          address.name
                        }
                        onChange={e =>
                          updateAddress(
                            'name',
                            e.target.value
                          )
                        }
                      />
                    </label>


                    <label>
                      Address line

                      <input
                        required
                        maxLength="180"
                        value={
                          address.line1
                        }
                        onChange={e =>
                          updateAddress(
                            'line1',
                            e.target.value
                          )
                        }
                      />
                    </label>


                    <label>
                      Area / Locality

                      <input
                        maxLength="100"
                        value={
                          address.area
                        }
                        onChange={e =>
                          updateAddress(
                            'area',
                            e.target.value
                          )
                        }
                      />
                    </label>


                    <div className="two">

                      <label>
                        City

                        <input
                          required
                          maxLength="80"
                          value={
                            address.city
                          }
                          onChange={e =>
                            updateAddress(
                              'city',
                              e.target.value
                            )
                          }
                        />
                      </label>


                      <label>
                        State

                        <input
                          required
                          maxLength="80"
                          value={
                            address.state
                          }
                          onChange={e =>
                            updateAddress(
                              'state',
                              e.target.value
                            )
                          }
                        />
                      </label>

                    </div>


                    <div className="two">

                      <label>
                        Pincode

                        <input
                          required
                          inputMode="numeric"
                          maxLength="10"
                          value={
                            address.pincode
                          }
                          onChange={e =>
                            updateAddress(
                              'pincode',
                              e.target.value
                                .replace(
                                  /\D/g,
                                  ''
                                )
                                .slice(
                                  0,
                                  10
                                )
                            )
                          }
                        />
                      </label>


                      <label>
                        Phone

                        <input
                          required
                          maxLength="20"
                          value={
                            address.phone
                          }
                          onChange={e =>
                            updateAddress(
                              'phone',
                              e.target.value
                            )
                          }
                        />
                      </label>

                    </div>


                    <label className="checkout-default-check">

                      <input
                        type="checkbox"
                        checked={
                          Boolean(
                            address.default
                          )
                        }
                        onChange={e =>
                          updateAddress(
                            'default',
                            e.target.checked
                          )
                        }
                      />

                      Save as default address

                    </label>


                    <button
                      type="button"
                      className="primary"
                      disabled={
                        savingAddress
                      }
                      onClick={
                        saveNewAddress
                      }
                    >
                      {savingAddress
                        ? 'Saving…'
                        : 'Save & Use This Address'}
                    </button>

                  </div>

                </div>
              )}


              {/* =====================================
                  SELECTED ADDRESS SUMMARY
              ===================================== */}

              {!showNewAddress &&
                selectedAddress && (
                  <div className="selected-checkout-address">

                    <span>
                      Delivering to
                    </span>

                    <strong>
                      {selectedAddress.name}
                    </strong>

                    <p>
                      {selectedAddress.line1}

                      {selectedAddress.area
                        ? `, ${selectedAddress.area}`
                        : ''}

                      {selectedAddress.city
                        ? `, ${selectedAddress.city}`
                        : ''}

                      {selectedAddress.state
                        ? `, ${selectedAddress.state}`
                        : ''}

                      {selectedAddress.pincode
                        ? ` - ${selectedAddress.pincode}`
                        : ''}
                    </p>

                  </div>
                )}
            </>
          )}


          <div className="notice">
            Payment is simulated for this academic
            project; the order itself is stored and
            processed through the real application flow.
          </div>


          {error && (
            <div className="error">
              {error}
            </div>
          )}


          {msg && (
            <div className="notice">
              {msg}
            </div>
          )}


          <button
            type="submit"
            className="primary checkout-place-order"
            disabled={
              placingOrder ||
              loadingAddresses ||
              !selectedAddress
            }
          >
            {placingOrder
              ? 'Placing Order…'
              : 'Place Order'}
          </button>

        </form>


        {/* =========================================
            ORDER SUMMARY
        ========================================= */}

        <aside className="panel summary">

          <h2>
            Summary
          </h2>


          {cart.map(item => (
            <div
              key={item.product}
            >

              <span>
                {item.name} × {item.quantity}
              </span>

              <b>
                ₹{(
                  item.price *
                  item.quantity
                ).toLocaleString(
                  'en-IN'
                )}
              </b>

            </div>
          ))}


          <hr />


          <div>

            <span>
              Shipping
            </span>

            <b>
              {shipping
                ? `₹${shipping}`
                : 'Free'}
            </b>

          </div>


          <div className="total">

            <span>
              Total
            </span>

            <b>
              ₹{(
                total +
                shipping
              ).toLocaleString(
                'en-IN'
              )}
            </b>

          </div>

        </aside>

      </div>

    </main>
  );
}