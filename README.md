# SkyNex — The Tech Hub

MERN electronics e-commerce platform. The customer storefront and the private administration portal run in the **same React/Vite application on port 5173**. The Express/MongoDB API remains on port 5000.

## Standard local setup
1. Start MongoDB.
2. Backend: `cd server`, `npm install`, copy `.env.example` to `.env`, set `MONGO_URI` and replace the example `JWT_SECRET` with a random value of at least 32 characters, then run `npm run seed` and `npm run dev`.
3. Storefront: `cd client`, `npm install`, copy `.env.example` to `.env`, then run `npm run dev`.
4. Open the public storefront at `http://localhost:5173`.

## Owner / developer only — private administration route
**Do not add this route to public navigation, public footer, or customer-facing documentation.**
- Administration login: `http://localhost:5173/skynex-control/login`
- Administration workspace: `http://localhost:5173/skynex-control`
- API: `http://localhost:5000/api`

The URL is not the security boundary. Server-side authentication, roles and permission middleware protect private APIs. Customer and administration sessions use separate token keys. Tokens expire after 8 hours; expired/invalid sessions are cleared and redirected to the appropriate login page.

## Account types
- `customer`: shopping, orders and account features.
- `admin`: full administration access.
- `staff`: only the permission areas assigned by an administrator.

## Administration capabilities
- Product/category/order/customer management.
- Staff account creation and permission assignment.
- Site customization: theme presets, color palette, font family and sizes, hero content/image, promotional offers, and store contact details.
- Dashboard layout options and business analytics with order-status histogram and order-mix chart.
- Bulk product import via CSV. Each imported product requires a name, valid price, and at least one image URL/path.

## Security and deployment notes
- Do not commit `.env` files or use seed credentials in production.
- The development seed creates `admin@skynex.local` with password `Admin@123`. Run `npm run seed` once on your configured development database if no admin account exists. The seed creates `admin@skynex.local` / `Admin@123` only when that account is absent and preserves existing admin/staff accounts. Change the development password before deployment.
- Restrict image uploads by file type/size and configure a production image storage provider for deployment.
- Test role and permission enforcement for every protected API before going live.
- This development build has not been security-audited or fully end-to-end tested.

## UI refresh
The customer storefront now uses a responsive violet/purple commerce visual system inspired by the supplied reference: compact search/navigation header, promotional hero, trust highlights, category tiles, product cards, and refreshed cart/product/detail/auth styling. Mobile layouts collapse to a compact header and two-column product cards. The administration portal has matching violet styling. This refresh is intended to change presentation while retaining existing routes and API logic.
