# SkyNex Administration, Staff & Bulk Product Guide

## Roles
- **Administrator**: full access to all administration functions.
- **Staff**: can sign in through the same private administration portal; permissions are assigned by an administrator and checked by the API.
- **Customer**: continues to use the public customer login.

## Private administration route
Open the admin app at `http://localhost:5174/login` during local development. Do not publish credentials in documentation. This route is not a substitute for authentication; the API checks the signed-in user and permissions.

## Staff
Sign in as an administrator and open **Staff & Permissions**. Create a staff account with a unique email and password (at least 8 characters), then select permissions. Staff cannot grant themselves permissions.

## Bulk product import
Open Products → Import CSV. CSV headers supported: `name,brand,category,price,oldPrice,discount,stock,images,description,featured`. Use `|` to separate multiple image URLs in the `images` column. Each row must contain at least one image URL. A header template is in `docs/products-import-template.csv`.

## Product images
Product creation and updates require at least one image. Select multiple files to upload, use the image URL field for existing URLs, and remove saved image URLs individually. Uploads are validated by the form and API.

## Dashboard layouts
The dashboard selector supports Cards, Compact and Textual layouts; the choice is saved in the current browser.

## Environment
Copy each `.env.example` to `.env` and set a unique `JWT_SECRET`, `MONGO_URI`, and other deployment-specific values. Never commit real secrets. Run `npm install` in each app folder before starting it.

## Important testing note
These changes are source-level implementation and require local integration testing with your MongoDB instance before production use. Review file-upload limits and deploy behind HTTPS.
