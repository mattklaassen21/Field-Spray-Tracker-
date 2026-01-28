# Quick Start - Deploy to TestFlight & Web

## 🚀 Quick Commands

### For TestFlight (iOS):

1. **Login to Expo**:
   ```bash
   eas login
   ```

2. **Build for iOS**:
   ```bash
   npm run build:ios
   ```

3. **Submit to TestFlight** (after build completes):
   ```bash
   npm run submit:ios
   ```

**Note**: Before submitting, update `eas.json` with your Apple Developer credentials:
- `appleId`: Your Apple ID email
- `ascAppId`: Your App Store Connect App ID
- `appleTeamId`: Your Apple Team ID

### For Web:

1. **Build for web**:
   ```bash
   npm run build:web
   ```

2. **Deploy to Vercel** (easiest):
   ```bash
   npm install -g vercel
   cd dist
   vercel --prod
   ```

   Or connect your GitHub repo to Vercel for automatic deployments.

3. **Deploy to Netlify**:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

## 📝 Before First Build

1. **Update bundle identifier** (if needed):
   - Current: `com.klaassen.warehouseorders`
   - Edit in `app.json` → `ios.bundleIdentifier`

2. **Update version numbers**:
   - `app.json` → `version`: "1.0.0"
   - `app.json` → `ios.buildNumber`: "1"
   - Increment these for each new build

3. **Configure Apple Developer**:
   - Sign in to [App Store Connect](https://appstoreconnect.apple.com)
   - Create a new app with your bundle identifier
   - EAS will handle certificates automatically on first build

## 🔧 Troubleshooting

**iOS Build Fails?**
- Check EAS dashboard for detailed error logs
- Ensure you're logged in: `eas whoami`
- Verify bundle identifier is unique

**Web Build Issues?**
- Make sure all dependencies are installed: `npm install`
- Check that `dist` folder is created after build
- Verify environment variables are set

## 📚 Full Documentation

See `DEPLOYMENT.md` for detailed instructions.
