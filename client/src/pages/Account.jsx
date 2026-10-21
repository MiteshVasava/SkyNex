import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound,
  Settings as SettingsIcon,
  ShoppingBag,
  MapPin,
  Shield,
  Trash2,
  LogOut,
  Camera,
  Pencil,
  Plus,
  Star,
  X
} from 'lucide-react';

import {
  api,
  assetUrl,
  uploadProfileImage,
  removeProfileImage
} from '../api';

import { useApp } from '../context/AppContext';

const emptyAddress = {
  label: 'Home',
  name: '',
  phone: '',
  line1: '',
  area: '',
  city: '',
  state: 'Gujarat',
  pincode: '',
  default: false
};

export default function Account() {
  const { user, setUser, logout } = useApp();

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState(user || {});

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const [imageBusy, setImageBusy] = useState(false);

  const [addressForm, setAddressForm] = useState({
    ...emptyAddress
  });

  const [addressEditingId, setAddressEditingId] = useState(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);

  const fileRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const data = await api('/users/me');

        if (mounted) {
          setUser(data);
          setForm(data);
        }
      } catch (e) {
        if (mounted) {
          setError(e.message);
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- PROFILE ---------------- */

  const beginEditProfile = () => {
    setError('');
    setMsg('');
    setCurrentPassword('');
    setForm(user || {});
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setCurrentPassword('');
    setForm(user || {});
    setError('');
    setMsg('');
  };

  const saveProfile = async () => {
    if (!currentPassword) {
      setError('Enter your current password to save profile changes.');
      return;
    }

    setError('');
    setMsg('');

    try {
      const updated = await api('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          currentPassword
        })
      });

      setUser(updated);
      setForm(updated);

      setCurrentPassword('');
      setEditingProfile(false);

      setMsg('Profile updated successfully.');
    } catch (e) {
      setError(e.message);
    }
  };

  /* ---------------- PROFILE IMAGE ---------------- */

  const changePhoto = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    setError('');
    setMsg('');

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please choose a JPG, PNG or WebP image.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Profile image must be 3 MB or smaller.');
      return;
    }

    setImageBusy(true);

    try {
      const result = await uploadProfileImage(file);

      const updated = {
        ...form,
        profileImage: result.profileImage
      };

      setForm(updated);
      setUser(updated);

      setMsg('Profile photo updated successfully.');
    } catch (e) {
      setError(e.message);
    } finally {
      setImageBusy(false);
    }
  };

  const deletePhoto = async () => {
    if (!form.profileImage) return;

    const confirmed = window.confirm(
      'Remove your profile photo?'
    );

    if (!confirmed) return;

    setError('');
    setMsg('');
    setImageBusy(true);

    try {
      await removeProfileImage();

      const updated = {
        ...form,
        profileImage: ''
      };

      setForm(updated);
      setUser(updated);

      setMsg('Profile photo removed.');
    } catch (e) {
      setError(e.message);
    } finally {
      setImageBusy(false);
    }
  };

  /* ---------------- ADDRESSES ---------------- */

  const startAddAddress = () => {
    setAddressEditingId(null);

    setAddressForm({
      ...emptyAddress,
      name: form.name || '',
      phone: form.phone || ''
    });

    setAddressFormOpen(true);
    setError('');
    setMsg('');
  };

  const startEditAddress = (address) => {
    setAddressEditingId(address._id);

    setAddressForm({
      label: address.label || 'Home',
      name: address.name || form.name || '',
      phone: address.phone || form.phone || '',
      line1: address.line1 || '',
      area: address.area || '',
      city: address.city || '',
      state: address.state || 'Gujarat',
      pincode: address.pincode || '',
      default: Boolean(address.default)
    });

    setAddressFormOpen(true);
    setError('');
    setMsg('');
  };

  const cancelAddress = () => {
    setAddressEditingId(null);
    setAddressFormOpen(false);
    setAddressForm({
      ...emptyAddress
    });
  };

  const saveAddress = async (event) => {
    event.preventDefault();

    if (addressBusy) return;

    setAddressBusy(true);
    setError('');
    setMsg('');

    try {
      const endpoint = addressEditingId
        ? `/users/me/addresses/${addressEditingId}`
        : '/users/me/addresses';

      const updatedAddresses = await api(endpoint, {
        method: addressEditingId ? 'PUT' : 'POST',
        body: JSON.stringify(addressForm)
      });

      const updatedUser = {
        ...form,
        addresses: updatedAddresses
      };

      setForm(updatedUser);
      setUser(updatedUser);

      const wasEditing = Boolean(addressEditingId);

      cancelAddress();

      setMsg(
        wasEditing
          ? 'Address updated successfully.'
          : 'Address added successfully.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setAddressBusy(false);
    }
  };

  const deleteAddress = async (id) => {
    const confirmed = window.confirm(
      'Delete this saved address?'
    );

    if (!confirmed) return;

    setError('');
    setMsg('');

    try {
      const updatedAddresses = await api(
        `/users/me/addresses/${id}`,
        {
          method: 'DELETE'
        }
      );

      const updatedUser = {
        ...form,
        addresses: updatedAddresses
      };

      setForm(updatedUser);
      setUser(updatedUser);

      if (addressEditingId === id) {
        cancelAddress();
      }

      setMsg('Address deleted successfully.');
    } catch (e) {
      setError(e.message);
    }
  };

  const makeDefault = async (id) => {
    setError('');
    setMsg('');

    try {
      const updatedAddresses = await api(
        `/users/me/addresses/${id}/default`,
        {
          method: 'PUT'
        }
      );

      const updatedUser = {
        ...form,
        addresses: updatedAddresses
      };

      setForm(updatedUser);
      setUser(updatedUser);

      setMsg('Default address updated.');
    } catch (e) {
      setError(e.message);
    }
  };

  /* ---------------- ACCOUNT DELETE ---------------- */

  const removeAccount = async () => {
    const confirmed = window.confirm(
      'Delete your account permanently? This cannot be undone.'
    );

    if (!confirmed) return;

    setError('');
    setMsg('');

    try {
      await api('/users/me', {
        method: 'DELETE'
      });

      logout();
      nav('/');
    } catch (e) {
      setError(e.message);
    }
  };

  const setTabSafe = (key) => {
    setError('');
    setMsg('');
    setTab(key);
  };

  return (
    <main className="page account-page">
      <div className="account-shell">

        {/* SIDEBAR */}
        <aside className="account-nav">

          <div className="account-user">

            <div className="avatar avatar-image-wrap">
              {form.profileImage ? (
                <img
                  src={assetUrl(form.profileImage)}
                  alt="Profile"
                />
              ) : (
                form.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>

            <div>
              <b>{form.name}</b>
              <small>{form.email}</small>
            </div>

          </div>

          {[
            ['profile', UserRound, 'My Profile'],
            ['settings', SettingsIcon, 'Settings'],
            ['orders', ShoppingBag, 'My Orders'],
            ['addresses', MapPin, 'Addresses'],
            ['security', Shield, 'Security']
          ].map(([key, Icon, title]) => (
            <button
              key={key}
              className={tab === key ? 'active' : ''}
              onClick={() =>
                key === 'orders'
                  ? nav('/orders')
                  : setTabSafe(key)
              }
            >
              <Icon />
              {title}
            </button>
          ))}

          <button
            className="danger-link"
            onClick={removeAccount}
          >
            <Trash2 />
            Delete Account
          </button>

          <button
            onClick={() => {
              logout();
              nav('/');
            }}
          >
            <LogOut />
            Logout
          </button>

        </aside>

        {/* CONTENT */}
        <section className="account-content">

          <span className="eyebrow">
            ACCOUNT
          </span>

          <h1>
            {tab === 'profile'
              ? 'My Profile'
              : tab === 'settings'
              ? 'Settings'
              : tab === 'addresses'
              ? 'Addresses'
              : 'Security'}
          </h1>

          {msg && (
            <div className="notice account-message">
              {msg}
            </div>
          )}

          {error && (
            <div className="error account-message">
              {error}
            </div>
          )}

          {/* PROFILE */}
          {tab === 'profile' && (
            <div className="panel profile-panel">

              <div className="profile-panel-head">

                <div>
                  <h2>
                    Personal Information
                  </h2>

                  <p>
                    View and manage your account information.
                  </p>
                </div>

                {!editingProfile && (
                  <button
                    className="secondary profile-edit-btn"
                    onClick={beginEditProfile}
                  >
                    <Pencil size={16} />
                    Edit Profile
                  </button>
                )}

              </div>

              {/* PROFILE PHOTO */}
              <div className="profile-photo-row">

                <div className="profile-photo-large">

                  {form.profileImage ? (
                    <img
                      src={assetUrl(form.profileImage)}
                      alt="Profile"
                    />
                  ) : (
                    <span>
                      {form.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}

                </div>

                <div className="profile-photo-actions">

                  <b>
                    Profile photo
                  </b>

                  <small>
                    JPG, PNG or WebP · maximum 3 MB
                  </small>

                  <div className="profile-photo-buttons">

                    <button
                      type="button"
                      className="secondary"
                      disabled={imageBusy}
                      onClick={() =>
                        fileRef.current?.click()
                      }
                    >
                      <Camera size={16} />

                      {form.profileImage
                        ? 'Change Photo'
                        : 'Add Photo'}
                    </button>

                    {form.profileImage && (
                      <button
                        type="button"
                        className="text-danger"
                        disabled={imageBusy}
                        onClick={deletePhoto}
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}

                  </div>

                  <input
                    ref={fileRef}
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={changePhoto}
                  />

                </div>

              </div>

              {/* PROFILE VIEW */}
              {!editingProfile && (
                <div className="profile-grid profile-readonly-grid">

                  <label>
                    Full name
                    <input
                      value={form.name || ''}
                      disabled
                      readOnly
                    />
                  </label>

                  <label>
                    Email
                    <input
                      value={form.email || ''}
                      disabled
                      readOnly
                    />
                  </label>

                  <label>
                    Phone
                    <input
                      value={form.phone || ''}
                      disabled
                      readOnly
                    />
                  </label>

                </div>
              )}

              {/* PROFILE EDIT */}
              {editingProfile && (
                <div className="profile-edit-box">

                  <div className="profile-grid">

                    <label>
                      Full name
                      <input
                        value={form.name || ''}
                        maxLength="80"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            name: e.target.value
                          })
                        }
                      />
                    </label>

                    <label>
                      Email
                      <input
                        type="email"
                        value={form.email || ''}
                        maxLength="160"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            email: e.target.value
                          })
                        }
                      />
                    </label>

                    <label>
                      Phone
                      <input
                        value={form.phone || ''}
                        maxLength="20"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phone: e.target.value
                          })
                        }
                      />
                    </label>

                  </div>

                  <label className="security-confirm">

                    Current password

                    <small>
                      Required to securely save profile changes.
                    </small>

                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) =>
                        setCurrentPassword(e.target.value)
                      }
                    />

                  </label>

                  <div className="profile-edit-actions">

                    <button
                      type="button"
                      className="secondary"
                      onClick={cancelEditProfile}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary"
                      disabled={!currentPassword}
                      onClick={saveProfile}
                    >
                      Save Profile
                    </button>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <Settings />
          )}

          {/* ADDRESSES */}
          {tab === 'addresses' && (
            <AddressManager
              addresses={form.addresses || []}
              form={addressForm}
              editingId={addressEditingId}
              formOpen={addressFormOpen}
              busy={addressBusy}
              onAdd={startAddAddress}
              onEdit={startEditAddress}
              onDelete={deleteAddress}
              onDefault={makeDefault}
              onCancel={cancelAddress}
              onSave={saveAddress}
              setForm={setAddressForm}
            />
          )}

          {/* SECURITY */}
          {tab === 'security' && (
            <Password />
          )}

        </section>
      </div>
    </main>
  );
}


/* =========================================================
   ADDRESS MANAGER
========================================================= */

function AddressManager({
  addresses,
  form,
  editingId,
  formOpen,
  busy,
  onAdd,
  onEdit,
  onDelete,
  onDefault,
  onCancel,
  onSave,
  setForm
}) {
  return (
    <div className="address-manager">

      <div className="address-manager-head">

        <div>
          <h2>
            Manage Addresses
          </h2>

          <p>
            Save delivery addresses for faster and easier checkout.
          </p>
        </div>

        {!formOpen && (
          <button
            type="button"
            className="address-add-btn"
            onClick={onAdd}
          >
            <Plus size={18} />
            Add a New Address
          </button>
        )}

      </div>

      {/* FORM */}
      {formOpen && (
        <form
          className="panel address-form"
          onSubmit={onSave}
        >

          <div className="panel-head">

            <div>
              <h2>
                {editingId
                  ? 'Edit Address'
                  : 'Add New Address'}
              </h2>

              <p>
                Enter your delivery information.
              </p>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={onCancel}
              aria-label="Close"
            >
              <X />
            </button>

          </div>

          <AddressFields
            form={form}
            setForm={setForm}
          />

          <div className="address-form-actions">

            <button
              type="button"
              className="secondary"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary"
              disabled={busy}
            >
              {busy
                ? 'Saving…'
                : 'Save Address'}
            </button>

          </div>

        </form>
      )}

      {/* EMPTY */}
      {!formOpen && addresses.length === 0 && (
        <div className="panel empty-address">

          <MapPin size={32} />

          <h3>
            No saved addresses
          </h3>

          <p>
            Add an address so checkout can use it instantly.
          </p>

          <button
            type="button"
            className="primary"
            onClick={onAdd}
          >
            Add Address
          </button>

        </div>
      )}

      {/* ADDRESS LIST */}
      <div className="address-list">

        {addresses.map((address) => (
          <div
            className={`panel saved-address ${
              address.default
                ? 'default-address'
                : ''
            }`}
            key={address._id}
          >

            <div className="saved-address-top">

              <span className="address-label">
                {address.label || 'Address'}
              </span>

              {address.default && (
                <span className="default-badge">
                  <Star size={12} />
                  Default
                </span>
              )}

              <div className="address-actions">

                <button
                  type="button"
                  title="Edit address"
                  aria-label="Edit address"
                  onClick={() =>
                    onEdit(address)
                  }
                >
                  <Pencil size={17} />
                </button>

                <button
                  type="button"
                  title="Delete address"
                  aria-label="Delete address"
                  onClick={() =>
                    onDelete(address._id)
                  }
                >
                  <Trash2 size={17} />
                </button>

              </div>

            </div>

            <div className="saved-address-name">

              <b>
                {address.name || 'Customer'}
              </b>

              {address.phone && (
                <b>
                  {address.phone}
                </b>
              )}

            </div>

            <p>
              {address.line1}

              {address.area
                ? `, ${address.area}`
                : ''}

              {address.city
                ? `, ${address.city}`
                : ''}

              {address.state
                ? `, ${address.state}`
                : ''}

              {address.pincode
                ? ` - ${address.pincode}`
                : ''}
            </p>

            {!address.default && (
              <button
                type="button"
                className="set-default"
                onClick={() =>
                  onDefault(address._id)
                }
              >
                Set as default
              </button>
            )}

          </div>
        ))}

      </div>

    </div>
  );
}


/* =========================================================
   ADDRESS FIELDS
========================================================= */

function AddressFields({
  form,
  setForm
}) {
  const update = (key, value) => {
    setForm({
      ...form,
      [key]: value
    });
  };

  return (
    <div className="address-fields">

      <div className="two">

        <label>
          Address label

          <select
            value={form.label}
            onChange={(e) =>
              update('label', e.target.value)
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
            value={form.name}
            onChange={(e) =>
              update('name', e.target.value)
            }
          />
        </label>

      </div>

      <div className="two">

        <label>
          Phone

          <input
            required
            maxLength="20"
            value={form.phone}
            onChange={(e) =>
              update(
                'phone',
                e.target.value
              )
            }
          />
        </label>

        <label>
          Pincode

          <input
            required
            inputMode="numeric"
            maxLength="10"
            value={form.pincode}
            onChange={(e) =>
              update(
                'pincode',
                e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 10)
              )
            }
          />
        </label>

      </div>

      <label>
        Address line

        <input
          required
          maxLength="180"
          value={form.line1}
          onChange={(e) =>
            update(
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
          value={form.area}
          onChange={(e) =>
            update(
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
            value={form.city}
            onChange={(e) =>
              update(
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
            value={form.state}
            onChange={(e) =>
              update(
                'state',
                e.target.value
              )
            }
          />
        </label>

      </div>

      <label className="default-check">

        <input
          type="checkbox"
          checked={Boolean(form.default)}
          onChange={(e) =>
            update(
              'default',
              e.target.checked
            )
          }
        />

        Set as default address

      </label>

    </div>
  );
}


/* =========================================================
   PASSWORD
========================================================= */

function Password() {
  const [passwords, setPasswords] = useState({
    current: '',
    next: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setMessage('');
    setError('');

    try {
      await api('/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          current: passwords.current,
          next: passwords.next
        })
      });

      setMessage(
        'Password changed successfully.'
      );

      setPasswords({
        current: '',
        next: ''
      });

    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="panel form-stack">

      <h2>
        Change Password
      </h2>

      <label>
        Current password

        <input
          type="password"
          autoComplete="current-password"
          value={passwords.current}
          onChange={(e) =>
            setPasswords({
              ...passwords,
              current: e.target.value
            })
          }
        />
      </label>

      <label>
        New password

        <input
          type="password"
          autoComplete="new-password"
          minLength="6"
          value={passwords.next}
          onChange={(e) =>
            setPasswords({
              ...passwords,
              next: e.target.value
            })
          }
        />
      </label>

      {message && (
        <div className="notice">
          {message}
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <button
        type="button"
        className="primary"
        disabled={
          !passwords.current ||
          passwords.next.length < 6
        }
        onClick={save}
      >
        Change Password
      </button>

    </div>
  );
}


/* =========================================================
   SETTINGS
========================================================= */

function Settings() {
  const [keys, setKeys] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          'skynex-settings'
        ) ||
        '{"orderUpdates":true,"promos":false}'
      );
    } catch {
      return {
        orderUpdates: true,
        promos: false
      };
    }
  });

  const toggle = (key) => {
    const next = {
      ...keys,
      [key]: !keys[key]
    };

    setKeys(next);

    localStorage.setItem(
      'skynex-settings',
      JSON.stringify(next)
    );
  };

  return (
    <div className="panel">

      <h2>
        Account settings
      </h2>

      <p>
        These preferences are saved on this device
        and take effect immediately.
      </p>

      <div className="setting-row">

        <span>
          <b>
            Order updates
          </b>

          <small>
            Keep order tracking notifications enabled.
          </small>
        </span>

        <input
          type="checkbox"
          checked={Boolean(keys.orderUpdates)}
          onChange={() =>
            toggle('orderUpdates')
          }
        />

      </div>

      <div className="setting-row">

        <span>
          <b>
            Promotional emails
          </b>

          <small>
            Allow promotional preferences for this account.
          </small>
        </span>

        <input
          type="checkbox"
          checked={Boolean(keys.promos)}
          onChange={() =>
            toggle('promos')
          }
        />

      </div>

    </div>
  );
}