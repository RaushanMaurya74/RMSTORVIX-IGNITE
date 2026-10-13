<?php
declare(strict_types=1);

/**
 * RMSTORVIX IGNITE — Front Controller & Application Router
 * Production-ready PHP Saas Engine
 */

// If running via PHP built-in server, serve static files directly
if (php_sapi_name() === 'cli-server') {
    $file = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (is_file($file)) {
        return false;
    }
}

require_once __DIR__ . '/../app/bootstrap.php';

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = rtrim($uri, '/');
if ($uri === '') $uri = '/';

// 1. HOME ROUTE
if ($uri === '/' && $method === 'GET') {
    if (user()) go('/dashboard');
    if (admin_user()) go('/admin');
    go('/login');
}

// 2. DEDICATED PLATFORM ADMIN AUTHENTICATION
if ($uri === '/admin/login') {
    if ($method === 'GET') {
        if (admin_user()) go('/admin');
        $flash = get_flash();
        require __DIR__ . '/../resources/views/admin/login.php';
        exit;
    }

    if ($method === 'POST') {
        check_csrf();
        $email = trim(strtolower($_POST['email'] ?? ''));
        $password = $_POST['password'] ?? '';

        $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $u = $stmt->fetch();

        if (!$u || !verify_password($password, (string)$u['password_hash'])) {
            audit('ADMIN_LOGIN_FAILED', null, ['email' => $email]);
            flash('danger', 'Invalid administrator credentials.');
            go('/admin/login');
        }

        if (!in_array($u['platform_role'], ['SUPER_ADMIN', 'PLATFORM_ADMIN'], true)) {
            audit('ADMIN_LOGIN_DENIED_ROLE', null, ['user_id' => $u['id']]);
            flash('danger', 'Access Denied: Only platform administrators can log into the Admin Console.');
            go('/admin/login');
        }

        if ($u['account_status'] !== 'ACTIVE') {
            flash('danger', 'Administrator account is suspended or inactive.');
            go('/admin/login');
        }

        $_SESSION['admin_user'] = $u;
        audit('ADMIN_LOGIN_SUCCESS', null, ['user_id' => $u['id']]);
        go('/admin');
    }
}

if ($uri === '/admin/logout') {
    unset($_SESSION['admin_user']);
    go('/admin/login');
}

// 3. DEDICATED PLATFORM ADMIN PORTAL
if ($uri === '/admin' || $uri === '/admin/dashboard') {
    $adminUser = admin_required();
    $pageTitle = 'Platform Command Center';
    $activeNav = 'overview';

    // Fetch Stats
    $totalBusinesses = (int)db()->query('SELECT COUNT(*) FROM businesses')->fetchColumn();
    $pendingApprovals = (int)db()->query('SELECT COUNT(*) FROM businesses WHERE approval_status = "PENDING"')->fetchColumn();
    $activeBusinesses = (int)db()->query('SELECT COUNT(*) FROM businesses WHERE approval_status = "APPROVED"')->fetchColumn();
    $suspendedBusinesses = (int)db()->query('SELECT COUNT(*) FROM businesses WHERE approval_status IN ("SUSPENDED", "REJECTED")')->fetchColumn();
    $totalUsers = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $auditLogCount = (int)db()->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn();

    $stats = compact('totalBusinesses', 'pendingApprovals', 'activeBusinesses', 'suspendedBusinesses', 'totalUsers', 'auditLogCount');
    $contentView = __DIR__ . '/../resources/views/admin/dashboard.php';

    require __DIR__ . '/../resources/views/admin/layout.php';
    exit;
}

// ADMIN APIS
if (str_starts_with($uri, '/api/admin/')) {
    $adminUser = admin_user();
    if (!$adminUser || !in_array($adminUser['platform_role'], ['SUPER_ADMIN', 'PLATFORM_ADMIN'], true)) {
        json_res(['error' => 'Platform Administrator authorization required.'], 403);
    }

    if ($uri === '/api/admin/stats' && $method === 'GET') {
        $totalBusinesses = (int)db()->query('SELECT COUNT(*) FROM businesses')->fetchColumn();
        $pendingApprovals = (int)db()->query('SELECT COUNT(*) FROM businesses WHERE approval_status = "PENDING"')->fetchColumn();
        $activeBusinesses = (int)db()->query('SELECT COUNT(*) FROM businesses WHERE approval_status = "APPROVED"')->fetchColumn();
        $suspendedBusinesses = (int)db()->query('SELECT COUNT(*) FROM businesses WHERE approval_status IN ("SUSPENDED", "REJECTED")')->fetchColumn();
        $totalUsers = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $auditLogCount = (int)db()->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn();

        json_res(compact('totalBusinesses', 'pendingApprovals', 'activeBusinesses', 'suspendedBusinesses', 'totalUsers', 'auditLogCount'));
    }

    if ($uri === '/api/admin/businesses' && $method === 'GET') {
        $status = $_GET['status'] ?? 'ALL';
        $sql = 'SELECT b.*, u.full_name AS owner_name, u.email, u.mobile FROM businesses b LEFT JOIN users u ON u.business_id = b.id AND u.business_role = "OWNER"';
        $params = [];
        if ($status !== 'ALL') {
            $sql .= ' WHERE b.approval_status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY b.id DESC';
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        json_res(['businesses' => $stmt->fetchAll()]);
    }

    if (preg_match('#^/api/admin/businesses/(\d+)/approve$#', $uri, $m) && $method === 'POST') {
        $bizId = (int)$m[1];
        $stmt = db()->prepare('UPDATE businesses SET approval_status = "APPROVED", approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL WHERE id = ?');
        $stmt->execute([$bizId]);
        audit('ADMIN_APPROVE_BUSINESS', $bizId);
        json_res(['success' => true, 'message' => 'Business approved.']);
    }

    if (preg_match('#^/api/admin/businesses/(\d+)/reject$#', $uri, $m) && $method === 'POST') {
        $bizId = (int)$m[1];
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = $data['reason'] ?? 'Documentation requirement not met';
        $stmt = db()->prepare('UPDATE businesses SET approval_status = "REJECTED", rejection_reason = ? WHERE id = ?');
        $stmt->execute([$reason, $bizId]);
        audit('ADMIN_REJECT_BUSINESS', $bizId, ['reason' => $reason]);
        json_res(['success' => true, 'message' => 'Business rejected.']);
    }

    if ($uri === '/api/admin/audit-logs' && $method === 'GET') {
        $stmt = db()->query('SELECT a.*, u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.id DESC LIMIT 50');
        json_res(['logs' => $stmt->fetchAll()]);
    }

    if ($uri === '/api/admin/backup-download' && $method === 'GET') {
        $config = require dirname(__DIR__) . '/config/database.php';
        $file = $config['sqlite']['database'];
        if (file_exists($file)) {
            header('Content-Type: application/x-sqlite3');
            header('Content-Disposition: attachment; filename="rmstorvix_ignite_backup.sqlite"');
            header('Content-Length: ' . filesize($file));
            readfile($file);
            exit;
        }
        json_res(['error' => 'Database file not found.'], 404);
    }
}

// 4. TENANT USER AUTHENTICATION
if ($uri === '/login') {
    if ($method === 'GET') {
        if (user()) go('/dashboard');
        $flash = get_flash();
        require __DIR__ . '/../resources/views/auth/login.php';
        exit;
    }

    if ($method === 'POST') {
        check_csrf();
        $email = trim(strtolower($_POST['email'] ?? ''));
        $password = $_POST['password'] ?? '';

        $stmt = db()->prepare('
            SELECT u.*, b.business_name, b.approval_status
            FROM users u
            LEFT JOIN businesses b ON b.id = u.business_id
            WHERE u.email = ?
        ');
        $stmt->execute([$email]);
        $u = $stmt->fetch();

        if (!$u || !verify_password($password, (string)$u['password_hash'])) {
            audit('LOGIN_FAILED', null, ['email' => $email]);
            flash('danger', 'Invalid email address or password.');
            go('/login');
        }

        if ($u['account_status'] !== 'ACTIVE') {
            flash('danger', 'Account is suspended. Please contact platform support.');
            go('/login');
        }

        $_SESSION['user'] = $u;
        audit('LOGIN_SUCCESS', $u['business_id'] ?? null);

        if ($u['platform_role'] === 'SUPER_ADMIN') {
            go('/admin');
        }

        if ($u['approval_status'] === 'PENDING') {
            go('/pending');
        }

        go('/dashboard');
    }
}

if ($uri === '/signup') {
    if ($method === 'GET') {
        if (user()) go('/dashboard');
        $flash = get_flash();
        require __DIR__ . '/../resources/views/auth/signup.php';
        exit;
    }

    if ($method === 'POST') {
        check_csrf();
        $name = trim($_POST['business_name'] ?? '');
        $owner = trim($_POST['owner_name'] ?? '');
        $email = trim(strtolower($_POST['email'] ?? ''));
        $mobile = trim($_POST['mobile'] ?? '');
        $gstin = trim(strtoupper($_POST['gstin'] ?? ''));
        $password = $_POST['password'] ?? '';

        if (!$name || !$owner || !$email || !$mobile || strlen($password) < 10) {
            flash('danger', 'Please fill in all mandatory fields with a 10+ character password.');
            go('/signup');
        }

        // Check duplicate email
        $chk = db()->prepare('SELECT id FROM users WHERE email = ?');
        $chk->execute([$email]);
        if ($chk->fetch()) {
            flash('danger', 'An account with this email address already exists.');
            go('/signup');
        }

        try {
            db()->beginTransaction();
            $stmtBiz = db()->prepare('
                INSERT INTO businesses (public_id, business_name, owner_name, business_type, gstin, email, mobile, address_line, city, state, pin_code, approval_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "PENDING")
            ');
            $bizPublicId = bin2hex(random_bytes(16));
            $stmtBiz->execute([$bizPublicId, $name, $owner, $_POST['business_type'] ?? 'PROPRIETORSHIP', $gstin ?: null, $email, $mobile, $_POST['address_line'] ?? '', $_POST['city'] ?? '', $_POST['state'] ?? '', $_POST['pin_code'] ?? '']);
            $bizId = (int)db()->lastInsertId();

            $stmtUser = db()->prepare('
                INSERT INTO users (public_id, business_id, full_name, email, mobile, password_hash, platform_role, business_role, account_status)
                VALUES (?, ?, ?, ?, ?, ?, "BUSINESS_USER", "OWNER", "ACTIVE")
            ');
            $userPublicId = bin2hex(random_bytes(16));
            $stmtUser->execute([$userPublicId, $bizId, $owner, $email, $mobile, hash_password($password)]);

            db()->commit();
            audit('BUSINESS_SIGNUP', $bizId, ['email' => $email]);
            flash('success', 'Registration submitted successfully! Your account enters PENDING APPROVAL status and will be activated by Platform Administrators.');
            go('/login');
        } catch (Throwable $e) {
            if (db()->inTransaction()) db()->rollBack();
            flash('danger', 'Failed to register: ' . $e->getMessage());
            go('/signup');
        }
    }
}

if ($uri === '/logout') {
    unset($_SESSION['user']);
    go('/login');
}

if ($uri === '/pending') {
    $u = user();
    if (!$u) go('/login');
    echo '<!doctype html><html><head><title>Pending Verification · RMSTORVIX IGNITE</title><link rel="stylesheet" href="/assets/css/app.css"></head><body class="not-found"><div><div class="brand-mark brand-logo" style="margin:0 auto 16px;"><img src="/assets/images/logo.png" style="height:60px;"></div><h1>Business Pending Approval</h1><p>Your registration is under review by a platform administrator. You will be notified once activated.</p><a href="/logout" class="button button-primary">Sign Out</a></div></body></html>';
    exit;
}

// 5. TENANT APPLICATION MODULES
$tenantRoutes = [
    '/dashboard' => ['title' => 'Business Overview', 'active' => 'dashboard', 'view' => __DIR__ . '/../resources/views/dashboard.php'],
    '/invoices' => ['title' => 'Billing & Invoices', 'active' => 'invoices', 'view' => __DIR__ . '/../resources/views/invoices.php'],
    '/billing' => ['title' => 'Billing & Invoices', 'active' => 'invoices', 'view' => __DIR__ . '/../resources/views/invoices.php'],
    '/purchases' => ['title' => 'Purchase Bills & Inward Supplies', 'active' => 'purchases', 'view' => __DIR__ . '/../resources/views/purchases.php'],
    '/inventory' => ['title' => 'Item Master & Stock', 'active' => 'inventory', 'view' => __DIR__ . '/../resources/views/inventory.php'],
    '/items' => ['title' => 'Item Master & Stock', 'active' => 'inventory', 'view' => __DIR__ . '/../resources/views/inventory.php'],
    '/parties' => ['title' => 'Customers & Suppliers', 'active' => 'parties', 'view' => __DIR__ . '/../resources/views/parties.php'],
    '/reports' => ['title' => 'Statutory Compliance & Reports', 'active' => 'reports', 'view' => __DIR__ . '/../resources/views/reports.php'],
    '/accounting' => ['title' => 'General Ledger & Day Book', 'active' => 'accounting', 'view' => __DIR__ . '/../resources/views/ledger.php'],
    '/ledger' => ['title' => 'General Ledger & Day Book', 'active' => 'accounting', 'view' => __DIR__ . '/../resources/views/ledger.php'],
    '/build-control' => ['title' => 'Build Control Center', 'active' => 'build-control', 'view' => __DIR__ . '/../resources/views/build-control.php'],
];

if (isset($tenantRoutes[$uri])) {
    $currentUser = login_required();
    $pageTitle = $tenantRoutes[$uri]['title'];
    $active = $tenantRoutes[$uri]['active'];
    $contentView = $tenantRoutes[$uri]['view'];

    require __DIR__ . '/../resources/views/layout.php';
    exit;
}

// 6. PRINTABLE INVOICE VIEW
if (preg_match('#^/invoice-print/(\d+)$#', $uri, $m)) {
    $invId = (int)$m[1];
    $stmt = db()->prepare('
        SELECT i.*, p.name AS customer_name, p.company_name AS customer_company, p.gstin AS customer_gstin, p.address AS customer_address, p.city AS customer_city, p.state AS customer_state, p.mobile AS customer_mobile,
               b.business_name, b.address_line, b.city AS biz_city, b.state AS biz_state, b.pin_code AS biz_pin, b.gstin AS biz_gstin, b.email AS biz_email, b.mobile AS biz_mobile
        FROM invoices i
        JOIN parties p ON p.id = i.customer_id
        JOIN businesses b ON b.id = i.business_id
        WHERE i.id = ?
    ');
    $stmt->execute([$invId]);
    $invoice = $stmt->fetch();
    if (!$invoice) {
        http_response_code(404);
        exit('Invoice not found');
    }

    $itemStmt = db()->prepare('SELECT * FROM invoice_items WHERE invoice_id = ?');
    $itemStmt->execute([$invId]);
    $items = $itemStmt->fetchAll();

    ?>
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Invoice <?= e($invoice['invoice_number']) ?> · RMSTORVIX IGNITE</title>
      <link rel="icon" type="image/png" href="/assets/images/favicon.png">
      <link rel="stylesheet" href="/assets/css/invoice-print.css">
    </head>
    <body>
      <div class="print-actions no-print">
        <button onclick="window.print()" class="btn-print">🖨 Print Invoice / Save as PDF</button>
        <button onclick="window.close()" class="btn-close">Close</button>
      </div>

      <div class="invoice-container">
        <header class="inv-header">
          <div class="inv-biz-info" style="display:flex;align-items:center;gap:16px;">
            <img src="/assets/images/logo.png" alt="RMSTORVIX IGNITE Logo" style="height:56px;object-fit:contain;">
            <div>
              <h1><?= e($invoice['business_name']) ?></h1>
              <p><?= e($invoice['address_line']) ?>, <?= e($invoice['biz_city']) ?>, <?= e($invoice['biz_state']) ?> - <?= e($invoice['biz_pin']) ?></p>
              <p><strong>GSTIN:</strong> <?= e($invoice['biz_gstin'] ?: 'N/A') ?> | <strong>Email:</strong> <?= e($invoice['biz_email']) ?> | <strong>Phone:</strong> <?= e($invoice['biz_mobile']) ?></p>
            </div>
          </div>
          <div class="inv-title-box">
            <h2>TAX INVOICE</h2>
            <p>Original for Recipient</p>
            <div class="inv-key-val">
              <div><strong>Invoice No:</strong> <?= e($invoice['invoice_number']) ?></div>
              <div><strong>Date:</strong> <?= e($invoice['invoice_date']) ?></div>
              <div><strong>Financial Year:</strong> <?= e($invoice['financial_year']) ?></div>
              <div><strong>Place of Supply:</strong> <?= e($invoice['place_of_supply'] ?: 'Same State') ?></div>
            </div>
          </div>
        </header>

        <div class="inv-parties">
          <div class="inv-party-card">
            <h4>Billed To (Customer Details)</h4>
            <p><strong><?= e($invoice['customer_name']) ?></strong></p>
            <?php if (!empty($invoice['customer_company'])): ?><p><?= e($invoice['customer_company']) ?></p><?php endif; ?>
            <p><?= e($invoice['customer_address'] ?: 'Customer address on file') ?>, <?= e($invoice['customer_city'] ?: '') ?>, <?= e($invoice['customer_state'] ?: '') ?></p>
            <p><strong>GSTIN:</strong> <?= e($invoice['customer_gstin'] ?: 'Unregistered Consumer') ?></p>
            <p><strong>Contact:</strong> <?= e($invoice['customer_mobile'] ?: 'N/A') ?></p>
          </div>
        </div>

        <table class="inv-items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description of Goods / Services</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              <th>Disc %</th>
              <th>Taxable (₹)</th>
              <th>Tax Rate</th>
              <th>Tax (₹)</th>
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($items as $idx => $it): ?>
              <tr>
                <td><?= $idx + 1 ?></td>
                <td><strong><?= e($it['description']) ?></strong></td>
                <td><?= e($it['hsn_sac'] ?: '-') ?></td>
                <td><?= (float)$it['quantity'] ?> <?= e($it['unit']) ?></td>
                <td>₹ <?= number_format((float)$it['rate'], 2) ?></td>
                <td><?= (float)$it['discount_percent'] ?>%</td>
                <td>₹ <?= number_format(((float)$it['rate'] * (float)$it['quantity'] - (float)$it['discount_amount']), 2) ?></td>
                <td><?= (float)$it['tax_rate'] ?>%</td>
                <td>₹ <?= number_format((float)$it['tax_amount'], 2) ?></td>
                <td class="text-right font-bold">₹ <?= number_format((float)$it['total_amount'], 2) ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>

        <div class="inv-summary-row">
          <div class="inv-tax-breakdown">
            <h4>GST Statutory Breakdown</h4>
            <table>
              <tr><td>CGST:</td><td>₹ <?= number_format((float)$invoice['cgst_amount'], 2) ?></td></tr>
              <tr><td>SGST:</td><td>₹ <?= number_format((float)$invoice['sgst_amount'], 2) ?></td></tr>
              <tr><td>IGST:</td><td>₹ <?= number_format((float)$invoice['igst_amount'], 2) ?></td></tr>
              <tr><th>Total GST:</th><th>₹ <?= number_format((float)$invoice['total_tax'], 2) ?></th></tr>
            </table>
          </div>
          <div class="inv-totals-box">
            <div class="inv-total-line"><span>Subtotal:</span><span>₹ <?= number_format((float)$invoice['subtotal'], 2) ?></span></div>
            <div class="inv-total-line"><span>Total GST:</span><span>₹ <?= number_format((float)$invoice['total_tax'], 2) ?></span></div>
            <div class="inv-total-line"><span>Round Off:</span><span>₹ <?= number_format((float)$invoice['round_off'], 2) ?></span></div>
            <div class="inv-grand-total"><span>Grand Total:</span><span>₹ <?= number_format((float)$invoice['grand_total'], 2) ?></span></div>
            <div class="inv-total-line"><span>Amount Paid:</span><span>₹ <?= number_format((float)$invoice['paid_amount'], 2) ?></span></div>
            <div class="inv-balance-line"><span>Balance Due:</span><span>₹ <?= number_format((float)$invoice['balance_amount'], 2) ?></span></div>
          </div>
        </div>
      </div>
    </body>
    </html>
    <?php
    exit;
}

// 7. 404 FALLBACK
http_response_code(404);
$pageTitle = 'Page Not Found';
$active = '';
require __DIR__ . '/../resources/views/404.php';
exit;
