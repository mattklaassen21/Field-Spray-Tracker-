# Deployment Guide

This guide will help you deploy the Warehouse Orders app to TestFlight (iOS) and as a website.

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Apple Developer Account**: Required for TestFlight (paid membership)
4. **Web Hosting**: For website deployment (Vercel, Netlify, or any static hosting)

## Environment Variables

Create a `.env` file in the root directory (optional, values are already in app.json):

```env
EXPO_PUBLIC_SUPABASE_URL=https://hctyrfslidpgysygtpyo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_FigwldTn0xbXbDzO5KDRGw_k_lhUsJz
```

## iOS / TestFlight Deployment

### Step 1: Login to Expo
```bash
eas login
```

### Step 2: Configure Apple Developer Account
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create an App ID with bundle identifier: `com.klaassen.warehouseorders`
3. Create certificates and provisioning profiles (EAS can do this automatically)

### Step 3: Update EAS Submit Configuration
Edit `eas.json` and update the submit section with your Apple credentials:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "your-app-store-connect-app-id",
      "appleTeamId": "your-apple-team-id"
    }
  }
}
```

### Step 4: Build for iOS
```bash
# Build for TestFlight
npm run build:ios

# Or build a preview version first
npm run build:ios:preview
```

### Step 5: Submit to TestFlight
After the build completes:
```bash
npm run submit:ios
```

Or manually:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Upload the build from EAS dashboard
3. Add to TestFlight and invite testers

## Web Deployment

### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Build the web app**:
   ```bash
   npm run build:web
   ```

3. **Deploy**:
   ```bash
   cd dist
   vercel
   ```

4. **For production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the web app**:
   ```bash
   npm run build:web
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod --dir=dist
   ```

### Option 3: Deploy to Any Static Host

1. **Build the web app**:
   ```bash
   npm run build:web
   ```

2. **Upload the `dist` folder** to your hosting provider:
   - The build output will be in the `dist` directory
   - Upload all files to your web server's public directory

### Web Configuration Notes

- The app uses Metro bundler for web
- All assets are included in the build
- Make sure your hosting supports client-side routing (SPA mode)
- For Vercel/Netlify, create a `vercel.json` or `netlify.toml` if needed for routing

## Updating the App

### For iOS:
1. Update `version` in `app.json`
2. Increment `buildNumber` in `app.json`
3. Run `npm run build:ios`
4. Submit to TestFlight

### For Web:
1. Make your changes
2. Run `npm run build:web`
3. Deploy the new `dist` folder

## Troubleshooting

### iOS Build Issues
- **Missing credentials**: EAS will guide you through credential setup
- **Bundle identifier conflict**: Change `bundleIdentifier` in `app.json`
- **Build fails**: Check EAS dashboard for detailed logs

### Web Build Issues
- **Environment variables**: Ensure they're set in `app.json` or `.env`
- **Routing issues**: Configure your hosting for SPA routing
- **Asset loading**: Check that all assets are in the `dist` folder

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Expo Web Deployment](https://docs.expo.dev/workflow/web/)
