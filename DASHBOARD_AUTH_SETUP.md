# Dashboard Authentication Setup Guide

## Overview

The dashboard authentication has been migrated from hardcoded `.env` credentials to **Firebase Authentication** with role-based access control. This provides better security, account lockout protection, and audit trails.

## How It Works Now

### Previous Implementation (DEPRECATED)
```javascript
// ❌ OLD METHOD - NO LONGER USED
EMAIL_DASHBOARD=admin@example.com
PASSWORD_DASHBOARD=mypassword123

// Simple string comparison (insecure)
if (email !== process.env.EMAIL_DASHBOARD || password !== process.env.PASSWORD_DASHBOARD) {
  return error
}
```

### New Implementation (Current)
```javascript
// ✅ NEW METHOD - Firebase Authentication
1. User submits email/password to /auth/login
2. Firebase authenticates the credentials
3. System checks if user has ROLE_ADMIN in Firestore
4. If admin, returns Firebase ID token
5. Token is used for subsequent API calls
```

## Setup Instructions

### Step 1: Create Admin User in Firebase

You need to create a Firebase user account through the Firebase Console or using the Firebase Admin SDK:

#### Option A: Firebase Console (Recommended for first admin)
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to **Authentication** > **Users**
4. Click **Add User**
5. Enter:
   - Email: `admin@yourdomain.com` (your admin email)
   - Password: Strong password (min 8 characters)
6. Click **Add User**
7. Copy the **User UID** (you'll need this for Step 2)

#### Option B: Using Firebase Admin SDK
```javascript
const admin = require('firebase-admin');

async function createAdminUser() {
  const userRecord = await admin.auth().createUser({
    email: 'admin@yourdomain.com',
    password: 'YourStrongPassword123!',
    displayName: 'Admin User',
    emailVerified: true
  });

  console.log('Created user with UID:', userRecord.uid);
  return userRecord.uid;
}
```

### Step 2: Assign Admin Role in Firestore

Once you have the User UID, add the admin role to Firestore:

#### Option A: Firebase Console
1. Go to **Firestore Database** in Firebase Console
2. Navigate to the collection specified in `COLLECTION_NAME_ROLE` env variable
3. Create a new document with:
   - **Document ID**: `<USER_UID_FROM_STEP_1>`
   - **Field**: `role` (type: array)
   - **Value**: `[<VALUE_OF_ROLE_ADMIN_ENV>]`

Example:
```
Collection: roles
Document ID: abc123xyz (the UID from Step 1)
Field: role = ["admin"]
```

#### Option B: Using Firebase Admin SDK
```javascript
const admin = require('firebase-admin');

async function assignAdminRole(uid) {
  await admin.firestore()
    .collection(process.env.COLLECTION_NAME_ROLE)
    .doc(uid)
    .set({
      role: [process.env.ROLE_ADMIN]
    });

  console.log('Admin role assigned to UID:', uid);
}
```

### Step 3: Remove Old Environment Variables

Remove these from your `.env` file (if they still exist):
```bash
# ❌ REMOVE THESE - NO LONGER NEEDED
EMAIL_DASHBOARD=
PASSWORD_DASHBOARD=
```

### Step 4: Update Your Environment Variables

Make sure these are set correctly in your `.env`:
```bash
# Required for role verification
COLLECTION_NAME_ROLE=roles
ROLE_ADMIN=admin

# Firebase configuration (should already be set)
FIREBASE_KEY=your-firebase-key
FIREBASE_DOMAIN=your-firebase-domain
FIREBASE_DATABASE=your-firebase-database
FIREBASE_PROJECT_ID=your-project-id
```

## Testing the New Authentication

### 1. Login Request
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YourStrongPassword123!"
  }'
```

### 2. Expected Success Response
```json
{
  "ok": true,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Error Responses

**Invalid credentials:**
```json
{
  "ok": false,
  "message": "Invalid credentials"
}
```

**User exists but not admin:**
```json
{
  "ok": false,
  "message": "Access denied. Admin privileges required."
}
```

**Too many failed attempts:**
```json
{
  "ok": false,
  "message": "Too many failed attempts. Please try again later."
}
```

## Security Benefits

### What Changed
| Old Method | New Method |
|------------|------------|
| ❌ Hardcoded in `.env` | ✅ Firebase managed credentials |
| ❌ No password hashing | ✅ Firebase bcrypt hashing |
| ❌ No account lockout | ✅ Automatic rate limiting |
| ❌ Weak JWT signing | ✅ Firebase ID tokens (RSA-256) |
| ❌ Single point of failure | ✅ Centralized auth management |
| ❌ No audit trail | ✅ Firebase audit logs |

### Additional Security Features
1. **Account Lockout**: Firebase automatically locks accounts after multiple failed attempts
2. **Token Expiration**: Firebase ID tokens expire after 1 hour
3. **Token Refresh**: Supports refresh tokens for seamless re-authentication
4. **Password Reset**: Can use Firebase password reset flows
5. **2FA Support**: Can enable 2FA on admin accounts in Firebase

## Adding More Admin Users

To add additional admin users:

1. Create user in Firebase (Step 1 above)
2. Assign admin role in Firestore (Step 2 above)
3. Done! They can now login with their credentials

## Revoking Admin Access

To remove admin privileges:

1. Go to Firestore
2. Find the user's document in `COLLECTION_NAME_ROLE` collection
3. Either:
   - Delete the document (removes all roles)
   - Remove `ROLE_ADMIN` from the `role` array
4. User can no longer access admin endpoints

## Troubleshooting

### "Invalid credentials" but password is correct
- Check that the user exists in Firebase Authentication
- Verify email is exactly correct (case-sensitive)
- Check Firebase logs for authentication errors

### "Access denied" error
- Verify user has admin role in Firestore
- Check that `COLLECTION_NAME_ROLE` env variable matches your collection name
- Check that `ROLE_ADMIN` env variable matches the role value (usually "admin")
- Verify the document ID in Firestore matches the user's UID

### "Too many failed attempts"
- Wait 15-30 minutes for Firebase to reset the counter
- Or reset the user's password in Firebase Console

## Migration Notes

If you had a working `.env` setup before:

1. **Your old credentials won't work anymore**
2. You MUST create a Firebase user account (Step 1)
3. You MUST assign the admin role (Step 2)
4. Update your client applications to use the new login endpoint

## Next Steps

- ✅ Set up your first admin user (Steps 1-2 above)
- ✅ Test the login flow
- ✅ Remove old `EMAIL_DASHBOARD` and `PASSWORD_DASHBOARD` from `.env`
- ✅ Update any client applications using the login API
- 🔐 Consider enabling 2FA on admin accounts in Firebase Console
- 📝 Document your admin users and their access levels

## Support

If you encounter issues:
1. Check Firebase Console for authentication errors
2. Verify Firestore has the correct role assignments
3. Check application logs for detailed error messages
4. Review the security audit report for additional context
