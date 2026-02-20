# Railway Configuration

## PostgreSQL Database Setup

When you add a PostgreSQL database in Railway, it automatically sets the `DATABASE_URL` environment variable in this format:

```
postgresql://postgres:password@hostname:port/railway
```

Your application is configured to use this automatically through the `DATABASE_URL` environment variable.

## Automatic Database Migrations

The application automatically creates database tables on startup using SQLModel. No manual migration steps required.

## Default Admin Account

On first deployment, the application automatically creates a default admin account:

- **Email:** admin@gmail.com
- **Password:** admin

**⚠️ Important:** Change this password immediately after first login via the profile page.

## Environment Variables Required

Set these in Railway project settings:

1. `SECRET_KEY` - Generate with: `openssl rand -hex 32`
2. `ALGORITHM` - Set to: `HS256`
3. `ACCESS_TOKEN_EXPIRE_MINUTES` - Recommended: `480` (8 hours)
4. `ENVIRONMENT` - Set to: `production`
5. `FRONTEND_URL` - Your Vercel frontend URL
6. `PRODUCTION_FRONTEND_URL` - Same as FRONTEND_URL

`DATABASE_URL` is automatically set by Railway when you add PostgreSQL.

## Health Check

Railway can monitor your application health using:

**Endpoint:** `/health`

Configure in Railway:
- Path: `/health`
- Expected Status: 200
- Interval: 60 seconds

## Logs

View logs in Railway:
1. Open your service
2. Click "Deployments"
3. Select a deployment
4. Click "View Logs"

Look for:
- `✅ Default admin account created: admin@gmail.com / admin`
- Table creation logs
- Server startup confirmation

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Verify PostgreSQL service is running in Railway
2. Check `DATABASE_URL` is set correctly
3. Look for connection errors in logs
4. Ensure database and backend are in same project

### CORS Errors

If you see CORS errors in browser:
1. Verify `FRONTEND_URL` matches your Vercel deployment exactly
2. No trailing slashes in URLs
3. Redeploy after changing environment variables

### Admin Account Not Created

If admin account isn't created on first deployment:
1. Check logs for database errors
2. Verify `DATABASE_URL` is correct
3. Ensure database tables were created
4. May need to manually create admin via Rails console if persistent

## Performance Optimization

For better performance in production:
- Enable Railway's automatic scaling
- Monitor database query performance
- Use connection pooling (automatic with PostgreSQL)
- Enable caching if needed

## Backups

Railway automatically backs up PostgreSQL databases:
- Go to Database service
- Click "Backups" tab
- Configure backup schedule
- Download backups if needed

## Custom Domain (Optional)

To use a custom domain:
1. Go to service settings in Railway
2. Click "Generate Domain" or "Add Custom Domain"
3. Configure DNS records as instructed
4. SSL certificate automatically provisioned

## Monitoring

Monitor your application:
- Railway dashboard shows resource usage
- Check CPU and memory metrics
- Set up alerts for errors
- Monitor response times

## Scaling

To scale your application:
1. Upgrade Railway plan for more resources
2. Enable autoscaling if needed
3. Monitor database connection limits
4. Consider horizontal scaling for high traffic
