# Assets Service API Test Documentation

This directory contains comprehensive HTTP test files for the Assets Service API. Each file tests different aspects of the system.

## Test Files Overview

### 1. `auth.http` (Original)
**Purpose:** Basic authentication flow testing
**Coverage:**
- User signup with email verification
- User signin
- Get current user info

### 2. `auth-extended.http` (New)
**Purpose:** Extended authentication testing including advanced features
**Coverage:**
- Complete signup/signin flow
- Google OAuth initiation and callback
- Password change flow (request + verification)
- Sign out functionality
- Error scenarios (invalid credentials, duplicate emails, etc.)
- Authentication edge cases

### 3. `bucket.http` (Original)
**Purpose:** Basic bucket management testing
**Coverage:**
- Create buckets (standard and configured)
- List buckets
- Get bucket by ID
- Update buckets
- Delete buckets

### 4. `asset.http` (Original)
**Purpose:** Basic asset management within buckets
**Coverage:**
- Upload assets to buckets
- List assets by bucket
- Get asset details
- Update asset metadata
- Download assets
- Delete assets
- Testing with bucket configurations

### 5. `secret.http` (Updated)
**Purpose:** Secret management and read token functionality
**Coverage:**
- Create secrets (with/without expiry, with validation URI)
- List and retrieve secrets
- Delete secrets and cleanup expired secrets
- Generate read tokens for bucket access
- Verify read tokens
- Error scenarios for invalid secrets/buckets

### 6. `secret-extended.http` (New)
**Purpose:** Advanced secret and read token testing
**Coverage:**
- Read token generation with various configurations
- Comprehensive read token verification
- Secret management edge cases
- Error handling for malformed tokens
- Cross-validation between secrets and buckets
- Authorization boundary testing

### 7. `direct-asset-access.http` (New)
**Purpose:** Testing direct asset access APIs (outside bucket interface)
**Coverage:**
- Direct asset creation via secret authentication
- Signed URL generation and access
- Asset access via read tokens
- Direct asset deletion
- Error scenarios for unauthorized access
- Secret-based authentication testing

### 8. `edge-cases.http` (New)
**Purpose:** Boundary conditions and edge cases
**Coverage:**
- Invalid input validation
- Cross-user access permission testing
- File upload edge cases (empty files, special characters)
- Bucket configuration validation
- Asset constraint violations
- Pagination boundary testing
- Authentication edge cases

### 9. `error-scenarios.http` (New)
**Purpose:** Comprehensive error condition testing
**Coverage:**
- Authentication failures (missing, invalid, expired tokens)
- Permission violations (cross-user access attempts)
- Validation errors (malformed JSON, invalid data types)
- Boundary condition violations
- Malformed requests
- File upload error scenarios
- Rate limiting scenarios

### 10. `comprehensive-flow.http` (New)
**Purpose:** End-to-end integration testing
**Coverage:**
- Complete user journey from signup to cleanup
- Full asset lifecycle (upload, access, update, delete)
- Secret and read token complete workflow
- Bucket management throughout user session
- Authentication state management
- Cross-feature integration testing

### 11. `integration.http` (Original)
**Purpose:** Basic integration testing
**Coverage:**
- Combined bucket, asset, and secret operations
- Basic workflow testing
- Cross-feature interactions

## API Coverage Summary

### Authentication APIs ✅
- `POST /auth/sign-up` - User registration
- `POST /auth/sign-up/verify` - Email verification
- `POST /auth/sign-in` - User login
- `POST /auth/sign-out` - User logout
- `GET /auth/me` - Get current user
- `GET /auth/google` - Google OAuth initiation
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/password/change` - Password change request
- `POST /auth/password/change/verify` - Password change verification

### Bucket Management APIs ✅
- `POST /buckets/` - Create bucket
- `GET /buckets/` - List user buckets
- `GET /buckets/:id` - Get bucket details
- `PUT /buckets/:id` - Update bucket
- `DELETE /buckets/:id` - Delete bucket

### Asset Management APIs ✅
- `POST /buckets/:bucketId/assets/` - Upload asset to bucket
- `GET /buckets/:bucketId/assets/` - List bucket assets
- `GET /buckets/:bucketId/assets/:id` - Get asset details
- `GET /buckets/:bucketId/assets/:id/download` - Download asset
- `PATCH /buckets/:bucketId/assets/:id` - Update asset
- `DELETE /buckets/:bucketId/assets/:id` - Delete asset

### Secret Management APIs ✅
- `POST /secrets/` - Create secret
- `GET /secrets/` - List user secrets
- `GET /secrets/:id` - Get secret details
- `DELETE /secrets/:id` - Delete secret
- `DELETE /secrets/expired/cleanup` - Clean up expired secrets
- `POST /secrets/issue/read-token` - Generate read token
- `POST /secrets/verify-read-token` - Verify read token

### Direct Asset Access APIs ✅
- `GET /assets/:assetId` - Access asset via read token
- `POST /assets/` - Create asset via secret
- `DELETE /assets/:assetId` - Delete asset via secret
- `POST /assets/signed-url` - Generate signed URL
- `GET /assets/signed/:signedUrl` - Access via signed URL

## Running the Tests

1. **Prerequisites:**
   - Ensure the server is running on `http://localhost:8000`
   - Use VS Code with REST Client extension or similar HTTP client
   - Database should be in a clean state for comprehensive testing

2. **Test Order Recommendations:**
   - Start with `auth-extended.http` for authentication setup
   - Run `comprehensive-flow.http` for full integration testing
   - Use specific feature files for focused testing
   - Run `error-scenarios.http` for robustness testing

3. **Test Data:**
   - Tests use consistent test user: `alimam@example.com`
   - Verification codes are hardcoded as `046071` (adjust as needed)
   - Clean up operations are included in most test files

## Notes

- All tests include proper cleanup to maintain database state
- Variable interpolation is used for dynamic data flow between requests
- Error scenarios test both expected failures and edge cases
- Authentication tokens are properly managed across requests
- File uploads test various content types and sizes
