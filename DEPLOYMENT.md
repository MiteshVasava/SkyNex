# SkyNex deployment: Vercel + Render + MongoDB Atlas

## Architecture
- Vercel hosts the Vite/React client from `client/`.
- Render hosts the Express API from `server/`.
- MongoDB Atlas hosts persistent database records.

## 1. Put the project on GitHub
1. Extract the project ZIP.
2. Create a new **private** GitHub repository.
3. Upload/push the contents of the `SkyNex` folder (the folders `client` and `server` must be at repository root).
4. Do not upload `.env` files, database credentials, JWT secrets, or real customer data.

## 2. Create MongoDB Atlas database
1. Create a MongoDB Atlas project and cluster.
2. Create a **database user** and save its password.
3. In Network Access, allow connections from your backend host. For a quick initial deployment, `0.0.0.0/0` allows connections from all IP addresses; use strong database credentials and tighter network access where practical.
4. Copy the application's MongoDB connection string and replace the username, password, and database name as needed. URL-encode special characters in the password.
5. Keep the URI secret; it belongs only in Render's environment settings.

## 3. Deploy the backend on Render
1. Open https://render.com and create a **New → Web Service** connected to the GitHub repository.
2. Set:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add environment variables in Render's Environment panel:
   - `MONGO_URI` = your Atlas connection string, with database name `skynex`
   - `JWT_SECRET` = a randomly generated secret of at least 32 characters
   - `NODE_ENV` = `production`
   - `CLIENT_ORIGIN` = the final Vercel site URL (add this after deploying the frontend; e.g. `https://your-project.vercel.app`)
4. Deploy and wait until the service is live.
5. Test `https://YOUR-SERVICE.onrender.com/api/health`. Expected response: `{"ok":true}`.
6. Copy the Render service URL, without `/api` at the end.

Generate a secret locally in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4. Deploy the frontend on Vercel
1. Open https://vercel.com and import the same GitHub repository.
2. In project settings / import configuration, set **Root Directory** to `client`.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Add the environment variable:
   - `VITE_API_URL` = `https://YOUR-SERVICE.onrender.com/api`
5. Deploy. The included `client/vercel.json` sends browser routes back to `index.html` so direct links such as `/products` and `/skynex-control/login` work.
6. Copy the final Vercel domain and set it as `CLIENT_ORIGIN` on Render if using the origin restriction below, then redeploy the API.

## 5. Important production considerations
- The current server uses local disk storage for uploaded images (`server/uploads`). On ephemeral hosting, uploaded files may disappear after redeploy/restart. For durable production image uploads, integrate Cloudinary, S3, or another persistent object storage service, or configure a supported persistent disk on your host. Do not assume the free filesystem is persistent.
- The frontend image paths have been updated to use the deployed API base URL for `/uploads/...` paths.
- Do not run `npm run seed` on a live database unless you have reviewed `server/seed/seed.js`. The development administrator credentials are documented in the project README; change credentials before making the site public.
- Before launch, test registration, customer login/logout, admin login/logout, product CRUD, image upload, checkout/order creation, staff permissions, and mobile layout.
- Vercel's `VITE_API_URL` is embedded into the frontend at build time. If you change it, redeploy the frontend.
- A public admin URL is not a security boundary. Keep server-side authentication/role checks and change all development credentials.
