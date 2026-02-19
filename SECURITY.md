# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of WorkForce Pro seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do the following:

1. **Do not** open a public issue about the vulnerability
2. Email details to: saivarshadevoju@gmail.com (replace with your actual email)
3. Include the following information:
   - Type of vulnerability
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

### What to expect:

- We will acknowledge your email within 48 hours
- We will send a more detailed response within 7 days
- We will work on a fix and coordinate the release
- We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When deploying WorkForce Pro:

1. **Change default credentials** immediately
2. **Use strong passwords** for all accounts
3. **Enable HTTPS** in production
4. **Keep dependencies updated** regularly
5. **Use environment variables** for sensitive data
6. **Configure CORS** properly for your domain
7. **Set up database backups** regularly
8. **Use secure database credentials**
9. **Enable rate limiting** on API endpoints
10. **Monitor logs** for suspicious activity

## Known Security Features

- JWT-based authentication
- Password hashing using bcrypt (cost factor: 12)
- SQL injection protection via SQLModel ORM
- CORS protection
- Input validation using Pydantic models
- Environment-based configuration
- Role-based access control (RBAC)

Thank you for helping keep WorkForce Pro and our users safe!
