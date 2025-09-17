# GrapeGuard Deployment Guide for Render

This guide will help you deploy your GrapeGuard React application to Render.

## Prerequisites

1. **GitHub Account**: Your code should be pushed to a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Node.js**: Version 16 or higher (Render will handle this automatically)

## Step-by-Step Deployment Process

### 1. Prepare Your Repository

Make sure your code is pushed to GitHub with the following files:
- ✅ `render.yaml` (already created)
- ✅ `.env.example` (already created)
- ✅ Updated `src/services/firebase.js` (already updated)
- ✅ Updated `package.json` (already updated)

### 2. Create a Render Account

1. Go to [render.com](https://render.com)
2. Sign up using your GitHub account
3. Authorize Render to access your repositories

### 3. Deploy Your Application

#### Option A: Using render.yaml (Recommended)

1. **Connect Repository**:
   - In your Render dashboard, click "New +"
   - Select "Static Site"
   - Connect your GitHub account if not already connected
   - Select your `grapeguard` repository

2. **Configure Deployment**:
   - **Name**: `grapeguard` (or any name you prefer)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (root of repository)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

3. **Environment Variables**:
   Render will automatically use the environment variables defined in `render.yaml`. No additional setup needed!

4. **Deploy**:
   - Click "Create Static Site"
   - Render will automatically build and deploy your application
   - The deployment process typically takes 2-5 minutes

#### Option B: Manual Configuration (Alternative)

If you prefer not to use `render.yaml`:

1. **Create Static Site**:
   - Click "New +" → "Static Site"
   - Connect your repository

2. **Configure Settings**:
   - **Name**: `grapeguard`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

3. **Add Environment Variables**:
   Go to Environment tab and add these variables:
   ```
   NODE_ENV=production
   REACT_APP_AUTH_API_KEY=AIzaSyCUc3Serwlq4Z-6ToXbR8vmEQxWmlBXOk8
   REACT_APP_AUTH_DOMAIN=grapeguard-acc43.firebaseapp.com
   REACT_APP_AUTH_DATABASE_URL=https://grapeguard-acc43-default-rtdb.asia-southeast1.firebasedatabase.app
   REACT_APP_AUTH_PROJECT_ID=grapeguard-acc43
   REACT_APP_AUTH_STORAGE_BUCKET=grapeguard-acc43.firebasestorage.app
   REACT_APP_AUTH_MESSAGING_SENDER_ID=270802234818
   REACT_APP_AUTH_APP_ID=1:270802234818:web:234a9bb8bf19add71fba5b
   REACT_APP_AUTH_MEASUREMENT_ID=G-3483H8EYFD
   REACT_APP_SENSOR_API_KEY=AIzaSyD3Ijs8q_qkUSE8lvNd_Zvzr-uvdWBjISs
   REACT_APP_SENSOR_DOMAIN=grapeguard-c7ad9.firebaseapp.com
   REACT_APP_SENSOR_DATABASE_URL=https://grapeguard-c7ad9-default-rtdb.firebaseio.com
   REACT_APP_SENSOR_PROJECT_ID=grapeguard-c7ad9
   REACT_APP_SENSOR_STORAGE_BUCKET=grapeguard-c7ad9.firebasestorage.app
   REACT_APP_SENSOR_MESSAGING_SENDER_ID=842909622610
   REACT_APP_SENSOR_APP_ID=1:842909622610:web:fc7b3def304e2240b75a8b
   REACT_APP_SENSOR_MEASUREMENT_ID=G-GPWZ3RW2SS
   ```

### 4. Custom Domain (Optional)

1. In your Render dashboard, go to your static site
2. Click "Settings" → "Custom Domains"
3. Add your domain name
4. Follow the DNS configuration instructions

### 5. Automatic Deployments

Render automatically deploys your application when you push changes to your main branch. You can also:
- **Manual Deploy**: Click "Manual Deploy" in the dashboard
- **Preview Deployments**: Create preview deployments for pull requests

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Firebase authentication works
- [ ] Database connections are functional
- [ ] All features are working as expected
- [ ] Environment variables are properly set

## Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check the build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Environment Variables Not Working**:
   - Ensure variables start with `REACT_APP_`
   - Check that variables are set in Render dashboard
   - Verify the variable names match your code

3. **Firebase Connection Issues**:
   - Verify Firebase configuration
   - Check Firebase project settings
   - Ensure domain is added to Firebase authorized domains

4. **Routing Issues**:
   - Add `_redirects` file in `public/` folder with:
     ```
     /*    /index.html   200
     ```

### Getting Help:

- Check Render documentation: [render.com/docs](https://render.com/docs)
- View build logs in your Render dashboard
- Check browser console for client-side errors

## Cost Information

- **Free Tier**: 750 hours/month, 100GB bandwidth
- **Paid Plans**: Start at $7/month for more resources
- **Custom Domains**: Free on all plans

## Security Notes

- Your Firebase API keys are now environment variables (more secure)
- Consider setting up Firebase security rules
- Monitor your Firebase usage to avoid unexpected charges

## Next Steps

After successful deployment:
1. Test all application features
2. Set up monitoring and alerts
3. Configure custom domain if needed
4. Set up CI/CD for automated deployments
5. Consider implementing analytics

Your GrapeGuard application should now be live and accessible via the Render URL!
