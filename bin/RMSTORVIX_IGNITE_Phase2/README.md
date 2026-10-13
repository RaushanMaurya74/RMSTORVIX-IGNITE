# RMSTORVIX IGNITE — Phase 2 starter
PHP 8.2+, MySQL 8+, XAMPP. This is an implementation increment, not a production-ready billing system.

## Install
1. Extract this folder to `C:\\xampp\\htdocs\\RMSTORVIX_IGNITE`.
2. Start Apache and MySQL in XAMPP.
3. Import `database/schema.sql`, then `database/phase2.sql` in phpMyAdmin.
4. Copy `.env.example` to `.env` and set DB credentials.
5. Recommended: configure Apache DocumentRoot to this project's `public/` folder.
6. Run `C:\\xampp\\php\\php.exe bin\\create-admin.php` from the project root to provision the first super-admin.
7. Open `/login`, register a test business at `/signup`, then approve it from `/admin`.

## Important limitations
Email/phone verification and email delivery are not configured. Password reset token delivery needs a mail provider. MFA, full role permissions, device/session management, tenant-aware business modules, automated tests, and production security review remain outstanding. Do not use for real business data before completing them.
