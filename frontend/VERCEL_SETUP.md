# Vercel Configuration

## Framework Detection

Vercel automatically detects Next.js and configures:
- Build command: `npm run build`
- Output directory: `.next`
- Install command: `npm install`

## Environment Variables

Set in Vercel project settings:

### Required
- `NEXT_PUBLIC_API_URL` - Your Railway backend URL (e.g., `https://your-app.railway.app`)

**Important:** 
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Other variables are only available during build time

## Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch (production)
- Create pull requests (preview deployments)
- Push to other branches (can be configured)

## Build Configuration

The `vercel.json` file in frontend directory contains:
- Build command
- Framework preset
- Output directory

## Testing Deployments

### Preview Deployments
- Automatically created for each commit/PR
- Get unique URL for testing
- Perfect for reviewing changes before production

### Production Deployment
- Happens when code is merged to `main`
- Available at your main Vercel URL
- Can configure custom domain

## Environment-Specific Variables

You can set different values for:
- **Production:** Used in main deployment
- **Preview:** Used in preview deployments
- **Development:** Used locally with `vercel dev`

## Custom Domain (Optional)

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records:
   - **A Record:** Point to Vercel IP
   - **CNAME:** Point to `cname.vercel-dns.com`
4. SSL automatically provisioned

## Performance Optimization

Vercel provides automatic optimizations:
- Image optimization
- Code splitting
- Edge caching
- Automatic compression
- Global CDN

## Monitoring

View deployment analytics:
1. Go to your project
2. Click "Analytics" tab
3. View:
   - Page views
   - Performance metrics
   - Error tracking
   - User analytics

## Logs

Access logs in Vercel:
1. Go to Deployments
2. Select a deployment
3. View:
   - Build logs
   - Function logs
   - Runtime logs

## Troubleshooting

### Build Failures

If build fails:
1. Check build logs for errors
2. Verify all dependencies in `package.json`
3. Test build locally: `npm run build`
4. Check Node.js version compatibility

### Environment Variables Not Working

If environment variables don't work:
1. Ensure they start with `NEXT_PUBLIC_` for client-side
2. Redeploy after adding/changing variables
3. Check logs for variable values (non-sensitive)
4. Verify no typos in variable names

### API Connection Issues

If frontend can't connect to backend:
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Ensure backend URL is accessible
3. Check CORS settings on backend
4. Look for errors in browser console

## Edge Functions (Optional)

For advanced use cases, you can use Vercel Edge Functions:
- Run code at the edge (close to users)
- Faster response times
- Middleware support

## Continuous Integration

Vercel integrates with:
- GitHub
- GitLab
- Bitbucket

Configure in Project Settings → Git

## Rollback

If something goes wrong:
1. Go to Deployments
2. Find last working deployment
3. Click "Promote to Production"
4. Instant rollback (no downtime)

## Bandwidth & Usage

Monitor usage:
- Go to Account → Usage
- View bandwidth consumption
- Check function invocations
- Monitor build minutes

**Hobby Plan Limits:**
- 100GB bandwidth/month
- Unlimited deployments
- Unlimited preview deployments

## Best Practices

1. **Caching:** Use `Cache-Control` headers
2. **Images:** Use Next.js Image component
3. **Code Splitting:** Use dynamic imports
4. **Environment Variables:** Keep secrets secure
5. **Preview Deployments:** Test before production
6. **Custom Domain:** Use for professional look
7. **Analytics:** Monitor performance regularly
