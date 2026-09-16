# Grofunder Landing Page - Sanity CMS Setup

This folder contains the complete setup for the Grofunder landing page with Sanity CMS integration.

## Project Structure

```
frontend-landingpage/
├── studio/                 # Sanity Studio
│   └── schemaTypes/       # Your new CMS schemas
│       ├── blogPost.ts
│       ├── heroSection.ts
│       ├── landingPageContent.ts
│       └── index.ts
└── web/                   # Next.js app
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Main landing page
    │   │   └── blog/
    │   │       ├── page.tsx       # Blog list
    │   │       └── [slug]/page.tsx # Individual posts
    │   └── lib/
    │       └── sanity.client.ts   # Sanity client
    └── .env.local          # Sanity credentials
```

## Quick Start

### 1. Replace Your Local Files

Copy the files from this folder to your local `C:\Users\ADMIN\frontend-landingpage\`:

- Replace `studio/schemaTypes/` files
- Replace `web/src/` files
- Copy `.env.local` to `web/`

### 2. Install Dependencies (already done)

Both `studio/` and `web/` should already have `node_modules/` installed from your earlier `npm install` commands.

### 3. Start Sanity Studio

```bash
cd studio
npm run dev
```

Visit: http://localhost:3333

Your content manager can now:
- Add blog posts
- Upload hero images
- Change colors (hex values)
- Upload icons and images
- Manage all landing page content

### 4. Start Next.js App

```bash
cd web
npm run dev
```

Visit: http://localhost:3000

The app automatically fetches content from Sanity.

## What Your Content Manager Can Do

### Hero Section
- Change heading and subheading
- Upload/change carousel images
- Set button text and link
- Adjust overlay color and opacity

### Blog Posts
- Write and publish articles
- Upload featured images
- Set author and publish date
- Format content with rich text

### Landing Page Sections
- Edit section colors (background, text, accent)
- Add/edit items with icons and images
- Change links and descriptions
- Manage all sections from one place

## Deployment

### Studio Deployment (Sanity Hosted)
The Studio is automatically hosted at sanity.io — no deployment needed.

### Web App Deployment (Vercel)

1. Push to GitHub
2. Import repo into Vercel
3. Set **Root Directory** to `web`
4. Set environment variables:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=1ldmvw16
   NEXT_PUBLIC_SANITY_DATASET=production
   ```
5. Deploy

Your site is now live and connected to Sanity.

## Credentials

- **Sanity Project ID:** 1ldmvw16
- **Dataset:** production
- **Organization ID:** ohafqu7cd

## Next Steps

1. Populate content in Sanity Studio
2. Deploy web app to Vercel
3. Give your content manager access to Sanity Studio at https://sanity.io
4. They can manage everything without touching code
