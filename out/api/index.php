<?php
/**
 * TwoBudz Hostinger MySQL Database REST API Bridge
 * Connects frontend static Next.js export with Hostinger MySQL
 */

// Disable error display so errors don't corrupt JSON response
error_reporting(0);
ini_set('display_errors', '0');

// Set JSON headers and open CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

// Database Configuration (Hostinger MySQL)
$dbHost = 'localhost';
$dbName = 'u554546348_AKrIN';
$dbUser = 'u554546348_JthqJ';
$dbPass = 'Twobudz@2026';

// Establish PDO connection
try {
    $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed: ' . $e->getMessage(),
        'hint' => 'Ensure database u554546348_AKrIN and user u554546348_JthqJ have been created and assigned in Hostinger hPanel.'
    ]);
    exit;
}

// Automatically ensure tables exist
function ensureTablesExist($pdo) {
    static $tablesChecked = false;
    if ($tablesChecked) return;

    $schema = "
    CREATE TABLE IF NOT EXISTS `products` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `name` TEXT NOT NULL,
        `slug` VARCHAR(255) NULL,
        `description` MEDIUMTEXT NULL,
        `longDescription` MEDIUMTEXT NULL,
        `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        `category` VARCHAR(100) NOT NULL DEFAULT 'gummies',
        `categories` JSON NULL,
        `categoryLabel` VARCHAR(191) NULL,
        `rating` DECIMAL(3,2) DEFAULT 5.00,
        `image` LONGTEXT NULL,
        `thc` VARCHAR(100) NULL,
        `cbd` VARCHAR(100) NULL,
        `options` JSON NULL,
        `benefits` JSON NULL,
        `labResults` JSON NULL,
        `reviewsCount` INT DEFAULT 0,
        `isBestSeller` TINYINT(1) DEFAULT 0,
        `isFeaturedHome` TINYINT(1) DEFAULT 0,
        `isNew` TINYINT(1) DEFAULT 0,
        `metaTitle` TEXT NULL,
        `metaDescription` TEXT NULL,
        `tags` TEXT NULL,
        `altText` TEXT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_cat` (`category`),
        INDEX `idx_slug` (`slug`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `categories` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL,
        `tagline` TEXT NULL,
        `desc` TEXT NULL,
        `image` LONGTEXT NULL,
        `icon` TEXT NULL,
        `showInMenu` TINYINT(1) DEFAULT 1,
        `isFeaturedHome` TINYINT(1) DEFAULT 1,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `blogs` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `title` TEXT NOT NULL,
        `summary` MEDIUMTEXT NULL,
        `content` LONGTEXT NULL,
        `date` VARCHAR(100) NULL,
        `category` VARCHAR(100) NULL,
        `image` LONGTEXT NULL,
        `author` VARCHAR(191) NULL,
        `slug` VARCHAR(255) NULL,
        `metaTitle` TEXT NULL,
        `metaDescription` TEXT NULL,
        `tags` TEXT NULL,
        `altText` TEXT NULL,
        `canonicalUrl` TEXT NULL,
        `isFeaturedHome` TINYINT(1) DEFAULT 0,
        `faqs` JSON NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_blog_slug` (`slug`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `faqs` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `question` TEXT NOT NULL,
        `answer` MEDIUMTEXT NOT NULL,
        `category` VARCHAR(100) NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `orders` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `customerName` VARCHAR(255) NOT NULL,
        `customerEmail` VARCHAR(255) NOT NULL,
        `customerPhone` VARCHAR(100) NULL,
        `shippingAddress` TEXT NULL,
        `customer` JSON NULL,
        `items` JSON NOT NULL,
        `totalAmount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        `total` DECIMAL(10,2) DEFAULT 0.00,
        `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
        `date` VARCHAR(100) NOT NULL,
        `deliveryMethod` VARCHAR(100) NULL,
        `paymentMethod` VARCHAR(100) NULL,
        `notes` TEXT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `inquiries` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `name` VARCHAR(255) NOT NULL,
        `email` VARCHAR(255) NOT NULL,
        `phone` VARCHAR(100) NULL,
        `message` MEDIUMTEXT NULL,
        `msg` MEDIUMTEXT NULL,
        `date` VARCHAR(100) NOT NULL,
        `status` VARCHAR(50) NOT NULL DEFAULT 'new',
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `reviews` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY,
        `productId` VARCHAR(191) NOT NULL,
        `productName` VARCHAR(255) NULL,
        `author` VARCHAR(255) NOT NULL,
        `rating` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
        `comment` MEDIUMTEXT NOT NULL,
        `title` VARCHAR(255) NULL,
        `date` VARCHAR(100) NULL,
        `status` VARCHAR(50) DEFAULT 'approved',
        `verified` TINYINT(1) DEFAULT 1,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_rev_prod` (`productId`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS `settings` (
        `id` VARCHAR(191) NOT NULL PRIMARY KEY DEFAULT 'business_info',
        `data` JSON NOT NULL,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($schema);

    // Ensure default business settings exist in MySQL
    try {
        $chk = $pdo->query("SELECT `id` FROM `settings` WHERE `id` = 'business_info' LIMIT 1")->fetch();
        if (!$chk) {
            $defaultSettings = [
                'id' => 'business_info',
                'phone' => '+1 (817) 494-3335',
                'email' => '',
                'hours' => 'Monday - Friday: 10:30am - 7:30 pm | Saturday: 10:30am - 6:30 pm | Sunday: 11:00 am - 6:00 pm',
                'location' => '730 W Pipeline Rd, Hurst, TX 76053',
                'heroBadge' => 'PREMIUM HEMP & CBD • HURST, TX',
                'heroHeadingLine1' => 'Earthy Purity.',
                'heroHeadingLine2' => 'Crafted Wellness & Relief.',
                'heroParagraph' => "Welcome to CBD American Shaman of Hurst, your local source for hemp, CBD flowers, clean tinctures, and targeted comfort.",
                'heroButtonPrimary' => 'EXPLORE PRODUCTS',
                'heroButtonSecondary' => 'OUR STORY',
                'heroImage' => '/images/hero_bg_1779557711335.png',
                'heroVerifiedText' => 'VERIFIED 100% LEGAL',
                'heroWidget1Image' => '/images/cbd_dropper_1779557730794.png',
                'heroWidget1Label' => 'BEST SELLER',
                'heroWidget1Title' => 'Organic CBD',
                'heroWidget1Rating' => '4.9',
                'heroWidget2Image' => '/images/thc_gummies_pack_1779557751523.png',
                'heroWidget2Label' => 'POPULAR',
                'heroWidget2Title' => 'Delta-9 Packs',
                'heroWidget2Sub' => 'Pure Extraction',
                'heroCommitmentLabel' => 'HURST STORE COMMITMENT',
                'heroCommitmentTitle' => 'Small Business Owned',
                'seoTitleOverride' => '',
                'seoDescriptionOverride' => '',
                'seoKeywordsOverride' => '',
                'urlShop' => 'shop',
                'urlLearn' => 'learn',
                'urlAbout' => 'about',
                'urlFaq' => 'faq'
            ];
            $st = $pdo->prepare("INSERT INTO `settings` (`id`, `data`) VALUES ('business_info', :data)");
            $st->execute([':data' => json_encode($defaultSettings)]);
        }
    } catch (Exception $e) {}
    try {
      $pdo->exec("UPDATE `settings` SET `data` = JSON_SET(`data`, '$.phone', '+1 (817) 494-3335', '$.email', '', '$.location', '730 W Pipeline Rd, Hurst, TX 76053', '$.heroBadge', 'PREMIUM HEMP & CBD • HURST, TX', '$.heroParagraph', 'Welcome to CBD American Shaman of Hurst, your local source for hemp, CBD flowers, clean tinctures, and targeted comfort.', '$.heroCommitmentLabel', 'HURST STORE COMMITMENT') WHERE `id` = 'business_info'");
    } catch (Exception $e) {}
    // Ensure image columns are LONGTEXT so images/base64 are never truncated at 65KB
    try {
        $pdo->exec("ALTER TABLE `blogs` MODIFY COLUMN `image` LONGTEXT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `products` MODIFY COLUMN `image` LONGTEXT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `categories` MODIFY COLUMN `image` LONGTEXT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `blogs` ADD COLUMN `canonicalUrl` TEXT NULL");
    } catch (Exception $e) {}

    $tablesChecked = true;
}

ensureTablesExist($pdo);

// Helper to decode JSON columns and convert MySQL types for frontend
function formatProductRow($p) {
    if (!$p) return $p;
    $p['price'] = (float)$p['price'];
    $p['rating'] = (float)$p['rating'];
    $p['reviewsCount'] = (int)($p['reviewsCount'] ?? 0);
    $p['isBestSeller'] = (bool)$p['isBestSeller'];
    $p['isFeaturedHome'] = (bool)$p['isFeaturedHome'];
    $p['isNew'] = (bool)$p['isNew'];

    if (isset($p['categories']) && is_string($p['categories'])) {
        $p['categories'] = json_decode($p['categories'], true) ?: [];
    }
    if (isset($p['options']) && is_string($p['options'])) {
        $p['options'] = json_decode($p['options'], true) ?: [];
    }
    if (isset($p['benefits']) && is_string($p['benefits'])) {
        $p['benefits'] = json_decode($p['benefits'], true) ?: [];
    }
    if (isset($p['labResults']) && is_string($p['labResults'])) {
        $p['labResults'] = json_decode($p['labResults'], true) ?: new stdClass();
    }
    return $p;
}

function formatCategoryRow($c) {
    if (!$c) return $c;
    $c['showInMenu'] = (bool)$c['showInMenu'];
    $c['isFeaturedHome'] = (bool)$c['isFeaturedHome'];
    return $c;
}

function formatBlogRow($b) {
    if (!$b) return $b;
    $b['isFeaturedHome'] = (bool)($b['isFeaturedHome'] ?? 0);
    if (isset($b['faqs']) && is_string($b['faqs'])) {
        $b['faqs'] = json_decode($b['faqs'], true) ?: [];
    }
    return $b;
}

function formatOrderRow($o) {
    if (!$o) return $o;
    $o['totalAmount'] = (float)$o['totalAmount'];
    $o['total'] = (float)($o['total'] ?? $o['totalAmount']);
    if (isset($o['items']) && is_string($o['items'])) {
        $o['items'] = json_decode($o['items'], true) ?: [];
    }
    if (isset($o['customer']) && is_string($o['customer'])) {
        $o['customer'] = json_decode($o['customer'], true) ?: new stdClass();
    }
    return $o;
}

function formatReviewRow($r) {
    if (!$r) return $r;
    $r['rating'] = (float)$r['rating'];
    $r['verified'] = (bool)$r['verified'];
    return $r;
}

// -------------------------------------------------------------
// Hurst Store SMTP Email Notification Engine
// -------------------------------------------------------------
function trySmtpTransport($host, $port, $encryption, $user, $pass, $fromEmail, $recipients, $emailPayload, &$logs) {
    $timeout = 2;
    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]);

    $remote = ($encryption === 'ssl') ? "ssl://{$host}:{$port}" : "tcp://{$host}:{$port}";
    $socket = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) {
        $logs[] = "Connect failed to {$remote}: [{$errno}] {$errstr}";
        return false;
    }

    stream_set_timeout($socket, $timeout);

    $read = function() use ($socket, &$logs) {
        $resp = '';
        while ($line = fgets($socket, 515)) {
            $resp .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        $logs[] = '< ' . trim($resp);
        return $resp;
    };

    $write = function($cmd, $mask = false) use ($socket, &$logs) {
        $logs[] = '> ' . ($mask ? '****' : trim($cmd));
        fputs($socket, $cmd . "\r\n");
    };

    $init = $read();
    if (strpos($init, '220') !== 0) {
        @fclose($socket);
        return false;
    }

    $write('EHLO twobudz.com');
    $ehlo = $read();

    if ($encryption === 'tls') {
        $write('STARTTLS');
        $tlsResp = $read();
        if (strpos($tlsResp, '220') !== 0) {
            @fclose($socket);
            return false;
        }
        // Enable TLS crypto on the established TCP connection
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            $logs[] = "TLS crypto negotiation failed";
            @fclose($socket);
            return false;
        }
        $write('EHLO twobudz.com');
        $ehlo = $read();
    }

    $write('AUTH LOGIN');
    $authResp = $read();
    if (strpos($authResp, '334') !== 0) {
        @fclose($socket);
        return false;
    }

    $write(base64_encode($user));
    $userResp = $read();
    if (strpos($userResp, '334') !== 0) {
        @fclose($socket);
        return false;
    }

    $write(base64_encode($pass), true);
    $passResp = $read();
    if (strpos($passResp, '235') !== 0) {
        $logs[] = "AUTH FAILED: " . trim($passResp);
        @fclose($socket);
        return false;
    }

    $write("MAIL FROM: <{$fromEmail}>");
    $mailResp = $read();
    if (strpos($mailResp, '250') !== 0) {
        @fclose($socket);
        return false;
    }

    $allRcptOk = true;
    foreach ($recipients as $rcpt) {
        $write("RCPT TO: <{$rcpt}>");
        $rcptResp = $read();
        if (strpos($rcptResp, '250') !== 0) {
            $allRcptOk = false;
        }
    }

    if (!$allRcptOk) {
        @fclose($socket);
        return false;
    }

    $write('DATA');
    $dataResp = $read();
    if (strpos($dataResp, '354') !== 0) {
        @fclose($socket);
        return false;
    }

    $write($emailPayload . "\r\n.");
    $sendResp = $read();
    $sent = (strpos($sendResp, '250') === 0);

    $write('QUIT');
    $read();
    @fclose($socket);

    return $sent;
}

function sendHostingerSmtpEmail($toEmail, $toName, $subject, $htmlContent, $replyTo = 'info@twobudz.com', $ccEmails = '') {
    $fromEmail = 'info@twobudz.com';
    $fromName = 'CBD American Shaman of Hurst';
    $smtpUser = 'info@twobudz.com';
    $smtpPass = 'TBflowermound1!';

    $recipients = [$toEmail];
    if (!empty($ccEmails)) {
        $ccList = array_map('trim', explode(',', $ccEmails));
        foreach ($ccList as $cc) {
            if (!empty($cc) && filter_var($cc, FILTER_VALIDATE_EMAIL) && !in_array($cc, $recipients)) {
                $recipients[] = $cc;
            }
        }
    }

    $emailHeaders = [
        "From: {$fromName} <{$fromEmail}>",
        "Reply-To: {$replyTo}",
        "To: {$toName} <{$toEmail}>",
        "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
        "Date: " . date('r'),
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "X-Mailer: TwoBudz Mailer 2.0"
    ];

    if (!empty($ccEmails)) {
        $emailHeaders[] = "Cc: {$ccEmails}";
    }

    $emailPayload = implode("\r\n", $emailHeaders) . "\r\n\r\n" . $htmlContent . "\r\n";

    $logs = [];

    // Attempt 1: GoDaddy SSL Port 465
    $ok = trySmtpTransport('smtpout.secureserver.net', 465, 'ssl', $smtpUser, $smtpPass, $fromEmail, $recipients, $emailPayload, $logs);
    if ($ok) return ['success' => true, 'transport' => 'smtpout.secureserver.net:465', 'logs' => $logs];

    // Attempt 2: GoDaddy STARTTLS Port 587
    $ok = trySmtpTransport('smtpout.secureserver.net', 587, 'tls', $smtpUser, $smtpPass, $fromEmail, $recipients, $emailPayload, $logs);
    if ($ok) return ['success' => true, 'transport' => 'smtpout.secureserver.net:587', 'logs' => $logs];

    // Attempt 3: Office 365 Direct STARTTLS Port 587
    $ok = trySmtpTransport('smtp.office365.com', 587, 'tls', $smtpUser, $smtpPass, $fromEmail, $recipients, $emailPayload, $logs);
    if ($ok) return ['success' => true, 'transport' => 'smtp.office365.com:587', 'logs' => $logs];

    // Attempt 4: Hostinger internal native mail() with proper envelope sender (-f)
    $nativeHeaders = "MIME-Version: 1.0\r\n";
    $nativeHeaders .= "Content-Type: text/html; charset=UTF-8\r\n";
    $nativeHeaders .= "From: {$fromName} <{$fromEmail}>\r\n";
    $nativeHeaders .= "Reply-To: {$replyTo}\r\n";
    if (!empty($ccEmails)) {
        $nativeHeaders .= "Cc: {$ccEmails}\r\n";
    }
    $nativeHeaders .= "X-Mailer: TwoBudz Native Mailer\r\n";

    // Deliver to every recipient in $recipients so that both primary AND CC inboxes receive the email!
    $anySent = false;
    foreach ($recipients as $target) {
        if (!empty($target) && filter_var($target, FILTER_VALIDATE_EMAIL)) {
            $mailOk = @mail($target, $subject, $htmlContent, $nativeHeaders);
            if (!$mailOk) {
                $mailOk = @mail($target, $subject, $htmlContent, $nativeHeaders, "-f {$fromEmail}");
            }
            if ($mailOk) {
                $anySent = true;
            }
        }
    }
    if ($anySent) {
        return ['success' => true, 'transport' => 'native_mail_sendmail', 'logs' => $logs];
    }

    return ['success' => false, 'transport' => 'failed_all', 'logs' => $logs];
}

// Build Customer Order Confirmation HTML Email (matches media_1789057244895.png)
function buildCustomerOrderEmailHtml($order) {
    $orderId = htmlspecialchars($order['id'] ?? ('BUDZ-' . rand(100000, 999999)));
    $cust = $order['customer'] ?? [];
    $firstName = htmlspecialchars($cust['firstName'] ?? ($order['customerName'] ?? 'Valued Customer'));
    if (empty($firstName)) $firstName = 'Valued Customer';
    
    $rawDate = $order['date'] ?? date('Y-m-d');
    $dateFormatted = date('F j, Y', strtotime($rawDate));
    if (!$dateFormatted || $dateFormatted === 'January 1, 1970') {
        $dateFormatted = date('F j, Y');
    }

    $subtotal = number_format((float)($order['subtotal'] ?? 0), 2);
    $tax = number_format((float)($order['tax'] ?? 0), 2);
    $shippingVal = (float)($order['shipping'] ?? 0);
    $deliveryMethod = $order['deliveryMethod'] ?? 'shipping';
    $shippingText = ($deliveryMethod === 'pickup' || $shippingVal == 0) ? 'In-Store Pickup: FREE' : ('Flat rate: $' . number_format($shippingVal, 2));
    $total = number_format((float)($order['totalAmount'] ?? $order['total'] ?? 0), 2);

    $rawItems = $order['items'] ?? [];
    if (is_string($rawItems)) {
        $rawItems = json_decode($rawItems, true) ?: [];
    }
    
    $itemsHtml = '';
    foreach ($rawItems as $item) {
        $pName = htmlspecialchars($item['productName'] ?? ($item['name'] ?? 'Botanical Product'));
        $pOption = htmlspecialchars($item['selectedOption'] ?? ($item['option'] ?? 'Standard'));
        $pQty = (int)($item['quantity'] ?? 1);
        $pPrice = number_format((float)($item['price'] ?? 0), 2);
        
        $pImg = $item['image'] ?? '/images/hero_bg_1779557711335.png';
        if (strpos($pImg, 'http') !== 0) {
            $pImg = 'https://cbdhurst.com' . (strpos($pImg, '/') === 0 ? '' : '/') . $pImg;
        }

        $itemsHtml .= '
        <tr style="border-bottom: 1px solid #edf2e8;">
          <td style="padding: 14px 8px 14px 0; vertical-align: middle; width: 68px;">
            <img src="' . htmlspecialchars($pImg) . '" alt="' . $pName . '" width="60" height="60" style="display: block; width: 60px; height: 60px; object-fit: cover; border-radius: 10px; border: 1px solid #e1e8db; background-color: #f7f9f4;" />
          </td>
          <td style="padding: 14px 12px; vertical-align: middle;">
            <div style="font-size: 14px; font-weight: 700; color: #2c3527; line-height: 1.3;">' . $pName . '</div>
            ' . (!empty($pOption) && $pOption !== 'Standard' ? '<div style="font-size: 12px; color: #72856a; margin-top: 3px;">– ' . $pOption . '</div>' : '') . '
          </td>
          <td style="padding: 14px 12px; vertical-align: middle; text-align: center; font-size: 14px; color: #4a5c44; white-space: nowrap;">
            ×' . $pQty . '
          </td>
          <td style="padding: 14px 0 14px 12px; vertical-align: middle; text-align: right; font-size: 14px; font-weight: 700; color: #2c3527; white-space: nowrap;">
            $' . $pPrice . '
          </td>
        </tr>';
    }

    return '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thank you for your order</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9f4; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f9f4; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e1e8db; border-radius: 20px; overflow: hidden; padding: 32px 28px; box-shadow: 0 4px 16px rgba(44, 53, 39, 0.04);">
          
          <!-- Top Header Brand Section -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #edf2e8;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <a href="https://cbdhurst.com" style="text-decoration: none; display: inline-block;">
                      <img src="https://cbdhurst.com/brand-logo.png" alt="CBD American Shaman of Hurst" width="160" style="display: block; width: 160px; max-width: 100%; height: auto; border: 0;" />
                    </a>
                  </td>
                  <td style="vertical-align: middle; border-left: 1px solid #d5dfce; padding-left: 16px; text-align: right; width: 140px;">
                    <div style="font-size: 8px; font-weight: 800; letter-spacing: 1.2px; color: #72856a; text-transform: uppercase; line-height: 1.4;">
                      PREMIUM CANNABIS WELLNESS<br>FOR A BETTER YOU
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding: 28px 0 12px 0;">
              <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: 900; color: #1a2217; margin: 0 0 12px 0; line-height: 1.2;">
                Thank you for your order
              </h1>
              <p style="font-size: 16px; font-weight: 600; color: #2c3527; margin: 0 0 10px 0;">
                Hi ' . $firstName . ',
              </p>
              <p style="font-size: 15px; color: #4a5c44; line-height: 1.5; margin: 0 0 8px 0;">
                We’ve received your order and your order is confirmed.
              </p>
              <p style="font-size: 14px; color: #72856a; line-height: 1.5; margin: 0 0 24px 0;">
                Here’s a reminder of what you’ve ordered:
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e1e8db; border-radius: 16px; padding: 20px 22px; margin-bottom: 24px;">
                <tr>
                  <td colspan="4" style="padding-bottom: 16px;">
                    <div style="font-size: 18px; font-weight: 800; color: #2c3527;">Order summary</div>
                    <div style="font-size: 13px; color: #72856a; margin-top: 3px;">Order #' . $orderId . ' (' . $dateFormatted . ')</div>
                  </td>
                </tr>
                <tr style="border-bottom: 2px solid #edf2e8;">
                  <th colspan="2" style="text-align: left; font-size: 12px; font-weight: 700; color: #72856a; text-transform: uppercase; padding-bottom: 8px;">Product</th>
                  <th style="text-align: center; font-size: 12px; font-weight: 700; color: #72856a; text-transform: uppercase; padding-bottom: 8px;">Quantity</th>
                  <th style="text-align: right; font-size: 12px; font-weight: 700; color: #72856a; text-transform: uppercase; padding-bottom: 8px;">Price</th>
                </tr>
                ' . $itemsHtml . '
                <tr>
                  <td colspan="4" style="padding-top: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 14px; color: #5b6b55; padding: 4px 0;">Subtotal:</td>
                        <td style="font-size: 14px; font-weight: 600; color: #2c3527; text-align: right; padding: 4px 0;">$' . $subtotal . '</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #5b6b55; padding: 4px 0;">Shipping:</td>
                        <td style="font-size: 14px; font-weight: 600; color: #2c3527; text-align: right; padding: 4px 0;">' . $shippingText . '</td>
                      </tr>
                      ' . ((float)$tax > 0 ? '
                      <tr>
                        <td style="font-size: 14px; color: #5b6b55; padding: 4px 0;">Texas Sales Tax (8.25%):</td>
                        <td style="font-size: 14px; font-weight: 600; color: #2c3527; text-align: right; padding: 4px 0;">$' . $tax . '</td>
                      </tr>' : '') . '
                      <tr style="border-top: 2px solid #e1e8db;">
                        <td style="font-size: 18px; font-weight: 900; color: #2c3527; padding-top: 12px;">Total:</td>
                        <td style="font-size: 22px; font-weight: 900; color: #2c3527; text-align: right; padding-top: 12px;">$' . $total . '</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Thank You Banner -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f6ed; border-radius: 14px; padding: 18px 20px;">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 15px; font-weight: 800; color: #2c3527;">
                      Thank you for shopping with CBD American Shaman of Hurst.
                    </div>
                    <div style="font-size: 9px; font-weight: 800; letter-spacing: 1.5px; color: #72856a; text-transform: uppercase; margin-top: 2px;">
                      GOOD PLANTS. BRIGHTER DAYS.
                    </div>
                  </td>
                  <td style="vertical-align: middle; text-align: right;">
                    <a href="https://cbdhurst.com" style="background-color: #243b22; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 800; padding: 10px 18px; border-radius: 8px; display: inline-block; white-space: nowrap;">
                      View your order →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3 Trust Badges -->
          <tr>
            <td style="padding: 18px 0; border-top: 1px solid #edf2e8; border-bottom: 1px solid #edf2e8;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center;">
                <tr>
                  <td style="width: 33.33%; padding: 4px;">
                    <div style="font-size: 16px;">🌿</div>
                    <div style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #5b6b55; text-transform: uppercase; margin-top: 4px;">
                      PREMIUM QUALITY
                    </div>
                  </td>
                  <td style="width: 33.33%; padding: 4px;">
                    <div style="font-size: 16px;">📦</div>
                    <div style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #5b6b55; text-transform: uppercase; margin-top: 4px;">
                      DISCREET SHIPPING
                    </div>
                  </td>
                  <td style="width: 33.33%; padding: 4px;">
                    <div style="font-size: 16px;">🛡️</div>
                    <div style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #5b6b55; text-transform: uppercase; margin-top: 4px;">
                      A HEALTHIER HAPPIER YOU
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 22px; text-align: center;">
              <p style="font-size: 12px; color: #72856a; line-height: 1.5; margin: 0 0 6px 0;">
                If you have any questions, feel free to reply to this email.<br>We’re here to help!
              </p>
              <p style="font-size: 11px; color: #9ab092; margin: 0;">
                CBD American Shaman of Hurst • 730 W Pipeline Rd, Hurst, TX 76053 • (817) 494-3335
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

// Build Store Owner / Admin Order Alert HTML Email
function buildOwnerOrderEmailHtml($order) {
    $orderId = htmlspecialchars($order['id'] ?? ('BUDZ-' . rand(100000, 999999)));
    $cust = $order['customer'] ?? [];
    $custName = htmlspecialchars($order['customerName'] ?? trim(($cust['firstName'] ?? '') . ' ' . ($cust['lastName'] ?? '')));
    if (empty($custName)) $custName = 'Customer';
    $custEmail = htmlspecialchars($order['customerEmail'] ?? ($cust['email'] ?? ''));
    $custPhone = htmlspecialchars($order['customerPhone'] ?? ($cust['phone'] ?? ''));
    
    $addr = htmlspecialchars($cust['address'] ?? ($order['shippingAddress'] ?? ''));
    $city = htmlspecialchars($cust['city'] ?? 'Hurst');
    $state = htmlspecialchars($cust['state'] ?? 'Texas');
    $zip = htmlspecialchars($cust['zipCode'] ?? '75028');
    $fullAddress = trim("{$addr}, {$city}, {$state} {$zip}");

    $deliveryMethod = htmlspecialchars($order['deliveryMethod'] ?? 'shipping');
    $deliveryLabel = ($deliveryMethod === 'pickup') ? '🏪 IN-STORE PICKUP (Hurst Store)' : '🚚 LOCAL DELIVERY / SHIPPING';

    $paymentMethod = htmlspecialchars($order['paymentMethod'] ?? 'card');
    $paymentLabel = ($paymentMethod === 'cash') ? '💵 Cash on Pickup / Delivery' : '💳 Credit / Debit Card';

    $subtotal = number_format((float)($order['subtotal'] ?? 0), 2);
    $tax = number_format((float)($order['tax'] ?? 0), 2);
    $shippingVal = (float)($order['shipping'] ?? 0);
    $shippingText = ($deliveryMethod === 'pickup' || $shippingVal == 0) ? 'FREE' : ('$' . number_format($shippingVal, 2));
    $total = number_format((float)($order['totalAmount'] ?? $order['total'] ?? 0), 2);
    $rawDate = $order['date'] ?? date('Y-m-d H:i:s');

    $rawItems = $order['items'] ?? [];
    if (is_string($rawItems)) {
        $rawItems = json_decode($rawItems, true) ?: [];
    }

    $itemsHtml = '';
    foreach ($rawItems as $item) {
        $pName = htmlspecialchars($item['productName'] ?? ($item['name'] ?? 'Product'));
        $pOption = htmlspecialchars($item['selectedOption'] ?? ($item['option'] ?? 'Standard'));
        $pQty = (int)($item['quantity'] ?? 1);
        $pPrice = number_format((float)($item['price'] ?? 0), 2);
        $rowTotal = number_format((float)($pQty * ($item['price'] ?? 0)), 2);

        $itemsHtml .= '
        <tr style="border-bottom: 1px solid #e1e8db;">
          <td style="padding: 12px 8px 12px 0;">
            <div style="font-weight: 700; font-size: 14px; color: #2c3527;">' . $pName . '</div>
            <div style="font-size: 12px; color: #72856a;">Option: ' . $pOption . '</div>
          </td>
          <td style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; color: #2c3527;">
            ' . $pQty . '
          </td>
          <td style="padding: 12px; text-align: right; font-size: 14px; color: #5b6b55;">
            $' . $pPrice . '
          </td>
          <td style="padding: 12px 0 12px 12px; text-align: right; font-size: 14px; font-weight: 700; color: #729c29;">
            $' . $rowTotal . '
          </td>
        </tr>';
    }

    return '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>New Order Alert #' . $orderId . '</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9f4; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f9f4; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border: 2px solid #729c29; border-radius: 20px; overflow: hidden; padding: 28px; box-shadow: 0 6px 20px rgba(44, 53, 39, 0.08);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding-bottom: 16px; border-bottom: 1px solid #edf2e8;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <a href="https://cbdhurst.com" style="text-decoration: none; display: inline-block;">
                      <img src="https://cbdhurst.com/brand-logo.png" alt="CBD American Shaman of Hurst" width="120" style="display: block; width: 120px; max-width: 100%; height: auto; border: 0;" />
                    </a>
                  </td>
                  <td style="text-align: right; vertical-align: middle;">
                    <div style="font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #72856a; text-transform: uppercase;">
                      CBD AMERICAN SHAMAN • HURST, TX
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Alert Banner -->
          <tr>
            <td style="padding-top: 18px; padding-bottom: 20px; border-bottom: 2px solid #edf2e8;">
              <div style="background-color: #729c29; color: #ffffff; display: inline-block; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                🚨 NEW STORE ORDER RECEIVED
              </div>
              <h1 style="font-size: 26px; font-weight: 900; color: #2c3527; margin: 12px 0 4px 0;">
                Order #' . $orderId . '
              </h1>
              <div style="font-size: 13px; color: #72856a;">
                Placed on ' . $rawDate . ' • Status: <strong>Pending Confirmation</strong>
              </div>
            </td>
          </tr>

          <!-- Customer Details Card -->
          <tr>
            <td style="padding: 24px 0 16px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f9f4; border: 1px solid #e1e8db; border-radius: 14px; padding: 18px 20px;">
                <tr>
                  <td colspan="2" style="font-size: 14px; font-weight: 800; color: #2c3527; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px; border-bottom: 1px solid #e1e8db;">
                    👤 CUSTOMER INFORMATION
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #72856a; width: 140px;">Customer Name:</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #2c3527;">' . $custName . '</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #72856a;">Customer Email:</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #2c3527;"><a href="mailto:' . $custEmail . '" style="color: #729c29; text-decoration: none;">' . $custEmail . '</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #72856a;">Customer Phone:</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #2c3527;">
                    ' . (!empty($custPhone) ? '<a href="tel:' . $custPhone . '" style="background-color: #729c29; color: #ffffff; text-decoration: none; padding: 5px 12px; border-radius: 6px; font-size: 13px; display: inline-block;">📞 Call ' . $custPhone . '</a>' : 'Not provided') . '
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #72856a;">Fulfillment Method:</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #2c3527;">' . $deliveryLabel . '</td>
                </tr>
                ' . ($deliveryMethod !== 'pickup' && !empty($fullAddress) ? '
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #72856a; vertical-align: top;">Shipping Address:</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #2c3527;">' . $fullAddress . '</td>
                </tr>' : '') . '
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #72856a;">Payment Method:</td>
                  <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #2c3527;">' . $paymentLabel . '</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #72856a;">Age Verification:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #729c29;">✓ Confirmed 21+ Under Texas Hemp Law</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered Table -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td colspan="4" style="font-size: 14px; font-weight: 800; color: #2c3527; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px;">
                    📦 ORDERED ITEMS
                  </td>
                </tr>
                <tr style="border-bottom: 2px solid #2c3527;">
                  <th style="text-align: left; font-size: 12px; font-weight: 700; color: #72856a; text-transform: uppercase; padding-bottom: 6px;">Item & Variant</th>
                  <th style="text-align: center; font-size: 12px; font-weight: 700; color: #72856a; text-transform: uppercase; padding-bottom: 6px;">Qty</th>
                  <th style="text-align: right; font-size: 12px; font-weight: 700; color: #72856a; text-transform: uppercase; padding-bottom: 6px;">Price</th>
                  <th style="text-align: right; font-size: 12px; font-weight: 700; color: #729c29; text-transform: uppercase; padding-bottom: 6px;">Subtotal</th>
                </tr>
                ' . $itemsHtml . '
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f6ed; border-radius: 12px; padding: 16px 20px;">
                <tr>
                  <td style="font-size: 14px; color: #5b6b55; padding: 3px 0;">Subtotal:</td>
                  <td style="font-size: 14px; font-weight: 600; color: #2c3527; text-align: right; padding: 3px 0;">$' . $subtotal . '</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #5b6b55; padding: 3px 0;">Shipping Fee:</td>
                  <td style="font-size: 14px; font-weight: 600; color: #2c3527; text-align: right; padding: 3px 0;">' . $shippingText . '</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #5b6b55; padding: 3px 0;">Texas Sales Tax (8.25%):</td>
                  <td style="font-size: 14px; font-weight: 600; color: #2c3527; text-align: right; padding: 3px 0;">$' . $tax . '</td>
                </tr>
                <tr style="border-top: 2px solid #729c29;">
                  <td style="font-size: 18px; font-weight: 900; color: #2c3527; padding-top: 10px;">TOTAL DUE:</td>
                  <td style="font-size: 24px; font-weight: 900; color: #729c29; text-align: right; padding-top: 10px;">$' . $total . '</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Direct Link to Admin Panel -->
          <tr>
            <td style="text-align: center; padding-top: 12px;">
              <a href="https://cbdhurst.com/admin" style="background-color: #2c3527; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 28px; border-radius: 10px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                👉 Open Admin Orders Dashboard
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

// Master dispatch function for sending both Customer Confirmation & Owner Alert
function dispatchTwoBudzOrderEmails($order) {
    if (empty($order) || !is_array($order)) {
        return ['success' => false, 'error' => 'Order data missing'];
    }

    $cust = $order['customer'] ?? [];
    $custEmail = $order['customerEmail'] ?? ($cust['email'] ?? '');
    $custName = $order['customerName'] ?? trim(($cust['firstName'] ?? '') . ' ' . ($cust['lastName'] ?? ''));
    if (empty($custName)) $custName = 'Valued Customer';
    $orderId = (string)($order['id'] ?? ('BUDZ-' . rand(100000, 999999)));

    // Prevent duplicate sending for the same order within 60 seconds
    $lockFile = sys_get_temp_dir() . '/tb_sent_' . md5($orderId);
    if (file_exists($lockFile) && (time() - filemtime($lockFile)) < 60) {
        return ['success' => true, 'skipped_duplicate' => true, 'orderId' => $orderId];
    }
    @touch($lockFile);

    $results = [
        'orderId' => $orderId,
        'customer' => null,
        'owner' => null
    ];

    // 1. Send Customer Order Confirmation Email
    if (!empty($custEmail) && filter_var($custEmail, FILTER_VALIDATE_EMAIL)) {
        $customerSubject = "Thank you for your order #{$orderId} - CBD American Shaman of Hurst";
        $customerHtml = buildCustomerOrderEmailHtml($order);
        $results['customer'] = sendHostingerSmtpEmail(
            $custEmail,
            $custName,
            $customerSubject,
            $customerHtml,
            'info@twobudz.com'
        );
    }

    // 2. Send Store Owner / Admin Order Alert Email
    $totalFormatted = number_format((float)($order['totalAmount'] ?? $order['total'] ?? 0), 2);
    $adminSubject = "🚨 New Order #{$orderId} - {$custName} (\${$totalFormatted})";
    $adminHtml = buildOwnerOrderEmailHtml($order);
    $results['owner'] = sendHostingerSmtpEmail(
        'info@twobudz.com',
        'CBD American Shaman of Hurst',
        $adminSubject,
        $adminHtml,
        $custEmail ?: 'info@twobudz.com',
        'twobudzcbd@gmail.com, cbdsouthlake@gmail.com'
    );

    return ['success' => true, 'details' => $results];
}

// Route handlers
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$table = $_GET['table'] ?? '';

// Health check endpoint
if ($action === 'health' || $action === 'ping') {
    try {
        $stats = [];
        $tables = ['products', 'categories', 'blogs', 'faqs', 'orders', 'inquiries', 'reviews', 'settings'];
        foreach ($tables as $t) {
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM `{$t}`");
            $stats[$t] = (int)$stmt->fetch()['count'];
        }
        echo json_encode([
            'success' => true,
            'status' => 'online',
            'database' => $dbName,
            'driver' => 'Hostinger MySQL PDO',
            'timestamp' => date('c'),
            'tableCounts' => $stats
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Test email endpoint
if ($action === 'test_email') {
    $targetEmail = $_GET['to'] ?? 'info@twobudz.com';
    $mockOrder = [
        'id' => 'TEST-' . rand(1000, 9999),
        'customer' => [
            'firstName' => 'Valued',
            'lastName' => 'Customer',
            'email' => $targetEmail,
            'phone' => '(972) 555-0199',
            'address' => '2701 Cross Timbers Rd #100',
            'city' => 'Hurst',
            'state' => 'TX',
            'zipCode' => '75028'
        ],
        'customerName' => 'Valued Customer',
        'customerEmail' => $targetEmail,
        'customerPhone' => '(972) 555-0199',
        'shippingAddress' => '730 W Pipeline Rd, Hurst, TX 76053',
        'items' => [
            [
                'productName' => 'Organic CBD Dropper - Natural Mint',
                'selectedOption' => '1000mg Dropper',
                'quantity' => 1,
                'price' => 49.99,
                'image' => '/images/cbd_dropper_1779557730794.png'
            ],
            [
                'productName' => 'Delta-9 THC Gummies - Berry Blast',
                'selectedOption' => '30 Gummies',
                'quantity' => 2,
                'price' => 39.99,
                'image' => '/images/thc_gummies_pack_1779557751523.png'
            ]
        ],
        'subtotal' => 129.97,
        'shipping' => 0.00,
        'tax' => 10.72,
        'total' => 140.69,
        'totalAmount' => 140.69,
        'deliveryMethod' => 'shipping',
        'paymentMethod' => 'cash_on_delivery',
        'status' => 'pending',
        'date' => date('M j, Y, g:i a')
    ];

    $result = dispatchTwoBudzOrderEmails($mockOrder);
    echo json_encode(['success' => true, 'action' => 'test_email', 'sentTo' => $targetEmail, 'results' => $result]);
    exit;
}

// -------------------------------------------------------------
// GET Requests: Fetch table data
// -------------------------------------------------------------
if ($method === 'GET') {
    if (!$table) {
        echo json_encode(['error' => 'Table parameter missing. Use ?table=[name] or ?action=health']);
        exit;
    }

    try {
        if ($table === 'all') {
            // Fetch entire site state in a single query batch
            $prods = array_map('formatProductRow', $pdo->query("SELECT * FROM `products` ORDER BY `created_at` DESC")->fetchAll());
            $cats = array_map('formatCategoryRow', $pdo->query("SELECT * FROM `categories` ORDER BY `title` ASC")->fetchAll());
            $blogs = array_map('formatBlogRow', $pdo->query("SELECT * FROM `blogs` ORDER BY `created_at` DESC")->fetchAll());
            $faqs = $pdo->query("SELECT * FROM `faqs`")->fetchAll();
            $orders = array_map('formatOrderRow', $pdo->query("SELECT * FROM `orders` ORDER BY `created_at` DESC")->fetchAll());
            $inquiries = $pdo->query("SELECT * FROM `inquiries` ORDER BY `created_at` DESC")->fetchAll();
            $reviews = array_map('formatReviewRow', $pdo->query("SELECT * FROM `reviews` ORDER BY `created_at` DESC")->fetchAll());
            
            $settingsStmt = $pdo->query("SELECT `data` FROM `settings` WHERE `id` = 'business_info' LIMIT 1");
            $settingsRow = $settingsStmt->fetch();
            $settings = $settingsRow ? json_decode($settingsRow['data'], true) : new stdClass();

            echo json_encode([
                'success' => true,
                'data' => [
                    'products' => $prods,
                    'categories' => $cats,
                    'blogs' => $blogs,
                    'faqs' => $faqs,
                    'orders' => $orders,
                    'inquiries' => $inquiries,
                    'reviews' => $reviews,
                    'settings' => $settings
                ]
            ]);
            exit;
        }

        if ($table === 'products') {
            $stmt = $pdo->query("SELECT * FROM `products` ORDER BY `created_at` DESC");
            $rows = array_map('formatProductRow', $stmt->fetchAll());
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        if ($table === 'categories') {
            $stmt = $pdo->query("SELECT * FROM `categories` ORDER BY `title` ASC");
            $rows = array_map('formatCategoryRow', $stmt->fetchAll());
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        if ($table === 'blogs') {
            $stmt = $pdo->query("SELECT * FROM `blogs` ORDER BY `created_at` DESC");
            $rows = array_map('formatBlogRow', $stmt->fetchAll());
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        if ($table === 'faqs') {
            $stmt = $pdo->query("SELECT * FROM `faqs`");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            exit;
        }

        if ($table === 'orders') {
            $stmt = $pdo->query("SELECT * FROM `orders` ORDER BY `created_at` DESC");
            $rows = array_map('formatOrderRow', $stmt->fetchAll());
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        if ($table === 'inquiries') {
            $stmt = $pdo->query("SELECT * FROM `inquiries` ORDER BY `created_at` DESC");
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            exit;
        }

        if ($table === 'reviews') {
            $prodId = $_GET['productId'] ?? null;
            if ($prodId) {
                $stmt = $pdo->prepare("SELECT * FROM `reviews` WHERE `productId` = ? ORDER BY `created_at` DESC");
                $stmt->execute([$prodId]);
            } else {
                $stmt = $pdo->query("SELECT * FROM `reviews` ORDER BY `created_at` DESC");
            }
            $rows = array_map('formatReviewRow', $stmt->fetchAll());
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        if ($table === 'settings') {
            $stmt = $pdo->query("SELECT `data` FROM `settings` WHERE `id` = 'business_info' LIMIT 1");
            $row = $stmt->fetch();
            if ($row && !empty($row['data'])) {
                $data = json_decode($row['data'], true);
                if (is_array($data) && count($data) > 0) {
                    echo json_encode(['success' => true, 'data' => $data]);
                    exit;
                }
            }
            $defaultSettings = [
                'id' => 'business_info',
                'phone' => '+1 (817) 494-3335',
                'email' => '',
                'hours' => 'Monday - Friday: 10:30am - 7:30 pm | Saturday: 10:30am - 6:30 pm | Sunday: 11:00 am - 6:00 pm',
                'location' => '730 W Pipeline Rd, Hurst, TX 76053',
                'heroBadge' => 'PREMIUM HEMP & CBD • HURST, TX',
                'heroHeadingLine1' => 'Earthy Purity.',
                'heroHeadingLine2' => 'Crafted Wellness & Relief.',
                'heroParagraph' => "Welcome to CBD American Shaman of Hurst, your local source for hemp, CBD flowers, clean tinctures, and targeted comfort.",
                'heroButtonPrimary' => 'EXPLORE PRODUCTS',
                'heroButtonSecondary' => 'OUR STORY',
                'heroImage' => '/images/hero_bg_1779557711335.png',
                'heroVerifiedText' => 'VERIFIED 100% LEGAL',
                'heroWidget1Image' => '/images/cbd_dropper_1779557730794.png',
                'heroWidget1Label' => 'BEST SELLER',
                'heroWidget1Title' => 'Organic CBD',
                'heroWidget1Rating' => '4.9',
                'heroWidget2Image' => '/images/thc_gummies_pack_1779557751523.png',
                'heroWidget2Label' => 'POPULAR',
                'heroWidget2Title' => 'Delta-9 Packs',
                'heroWidget2Sub' => 'Pure Extraction',
                'heroCommitmentLabel' => 'HURST STORE COMMITMENT',
                'heroCommitmentTitle' => 'Small Business Owned',
                'seoTitleOverride' => '',
                'seoDescriptionOverride' => '',
                'seoKeywordsOverride' => '',
                'urlShop' => 'shop',
                'urlLearn' => 'learn',
                'urlAbout' => 'about',
                'urlFaq' => 'faq'
            ];
            echo json_encode(['success' => true, 'data' => $defaultSettings]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => "Unknown table: {$table}"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// -------------------------------------------------------------
// POST Requests: Mutations (Upsert, Delete, Seed)
// -------------------------------------------------------------
$inputRaw = file_get_contents('php://input');
$body = json_decode($inputRaw, true) ?: [];
$postAction = $body['action'] ?? $_POST['action'] ?? $action;
$postTable = $body['table'] ?? $_POST['table'] ?? $table;
$data = $body['data'] ?? $_POST['data'] ?? $body;

// Order confirmation & owner alert email dispatch action
if ($postAction === 'send_order_email') {
    $orderData = !empty($data['order']) ? $data['order'] : $data;
    $res = dispatchTwoBudzOrderEmails($orderData);
    echo json_encode(['success' => true, 'emails' => $res]);
    exit;
}

// 1. SEED ALL / BULK POPULATE
if ($postAction === 'seed_all' || $postAction === 'push_all') {
    try {
        $pdo->beginTransaction();

        $counts = [
            'products' => 0,
            'categories' => 0,
            'blogs' => 0,
            'faqs' => 0,
            'orders' => 0,
            'inquiries' => 0,
            'reviews' => 0,
            'settings' => false
        ];

        // Products
        if (!empty($data['products']) && is_array($data['products'])) {
            $stmtProd = $pdo->prepare("
                INSERT INTO `products` (
                    `id`, `name`, `slug`, `description`, `longDescription`, `price`, `category`,
                    `categories`, `categoryLabel`, `rating`, `image`, `thc`, `cbd`, `options`,
                    `benefits`, `labResults`, `reviewsCount`, `isBestSeller`, `isFeaturedHome`,
                    `isNew`, `metaTitle`, `metaDescription`, `tags`, `altText`
                ) VALUES (
                    :id, :name, :slug, :description, :longDescription, :price, :category,
                    :categories, :categoryLabel, :rating, :image, :thc, :cbd, :options,
                    :benefits, :labResults, :reviewsCount, :isBestSeller, :isFeaturedHome,
                    :isNew, :metaTitle, :metaDescription, :tags, :altText
                ) ON DUPLICATE KEY UPDATE
                    `name`=VALUES(`name`), `slug`=VALUES(`slug`), `description`=VALUES(`description`),
                    `longDescription`=VALUES(`longDescription`), `price`=VALUES(`price`), `category`=VALUES(`category`),
                    `categories`=VALUES(`categories`), `categoryLabel`=VALUES(`categoryLabel`), `rating`=VALUES(`rating`),
                    `image`=VALUES(`image`), `thc`=VALUES(`thc`), `cbd`=VALUES(`cbd`), `options`=VALUES(`options`),
                    `benefits`=VALUES(`benefits`), `labResults`=VALUES(`labResults`), `reviewsCount`=VALUES(`reviewsCount`),
                    `isBestSeller`=VALUES(`isBestSeller`), `isFeaturedHome`=VALUES(`isFeaturedHome`), `isNew`=VALUES(`isNew`),
                    `metaTitle`=VALUES(`metaTitle`), `metaDescription`=VALUES(`metaDescription`), `tags`=VALUES(`tags`),
                    `altText`=VALUES(`altText`), `updated_at`=NOW()
            ");

            foreach ($data['products'] as $p) {
                if (empty($p['id'])) continue;
                $stmtProd->execute([
                    ':id' => (string)$p['id'],
                    ':name' => $p['name'] ?? 'Product',
                    ':slug' => $p['slug'] ?? (string)$p['id'],
                    ':description' => $p['description'] ?? '',
                    ':longDescription' => $p['longDescription'] ?? $p['description'] ?? '',
                    ':price' => (float)($p['price'] ?? 0),
                    ':category' => $p['category'] ?? 'gummies',
                    ':categories' => json_encode($p['categories'] ?? [$p['category'] ?? 'all']),
                    ':categoryLabel' => $p['categoryLabel'] ?? '',
                    ':rating' => (float)($p['rating'] ?? 5.0),
                    ':image' => $p['image'] ?? '',
                    ':thc' => $p['thc'] ?? '< 0.3% THC',
                    ':cbd' => $p['cbd'] ?? '500mg CBD',
                    ':options' => json_encode($p['options'] ?? []),
                    ':benefits' => json_encode($p['benefits'] ?? []),
                    ':labResults' => json_encode($p['labResults'] ?? new stdClass()),
                    ':reviewsCount' => (int)($p['reviewsCount'] ?? 0),
                    ':isBestSeller' => !empty($p['isBestSeller']) ? 1 : 0,
                    ':isFeaturedHome' => !empty($p['isFeaturedHome']) ? 1 : (!empty($p['isBestSeller']) ? 1 : 0),
                    ':isNew' => !empty($p['isNew']) ? 1 : 0,
                    ':metaTitle' => $p['metaTitle'] ?? '',
                    ':metaDescription' => $p['metaDescription'] ?? '',
                    ':tags' => is_string($p['tags'] ?? null) ? $p['tags'] : '',
                    ':altText' => $p['altText'] ?? '',
                ]);
                $counts['products']++;
            }
        }

        // Categories
        if (!empty($data['categories']) && is_array($data['categories'])) {
            $stmtCat = $pdo->prepare("
                INSERT INTO `categories` (`id`, `title`, `tagline`, `desc`, `image`, `icon`, `showInMenu`, `isFeaturedHome`)
                VALUES (:id, :title, :tagline, :desc, :image, :icon, :showInMenu, :isFeaturedHome)
                ON DUPLICATE KEY UPDATE
                    `title`=VALUES(`title`), `tagline`=VALUES(`tagline`), `desc`=VALUES(`desc`),
                    `image`=VALUES(`image`), `icon`=VALUES(`icon`), `showInMenu`=VALUES(`showInMenu`),
                    `isFeaturedHome`=VALUES(`isFeaturedHome`), `updated_at`=NOW()
            ");

            foreach ($data['categories'] as $c) {
                if (empty($c['id'])) continue;
                $stmtCat->execute([
                    ':id' => (string)$c['id'],
                    ':title' => $c['title'] ?? '',
                    ':tagline' => $c['tagline'] ?? '',
                    ':desc' => $c['desc'] ?? '',
                    ':image' => $c['image'] ?? '',
                    ':icon' => $c['icon'] ?? '',
                    ':showInMenu' => isset($c['showInMenu']) ? ($c['showInMenu'] ? 1 : 0) : 1,
                    ':isFeaturedHome' => isset($c['isFeaturedHome']) ? ($c['isFeaturedHome'] ? 1 : 0) : 1,
                ]);
                $counts['categories']++;
            }
        }

        // Blogs
        if (!empty($data['blogs']) && is_array($data['blogs'])) {
            $stmtBlog = $pdo->prepare("
                INSERT INTO `blogs` (
                    `id`, `title`, `summary`, `content`, `date`, `category`, `image`,
                    `author`, `slug`, `metaTitle`, `metaDescription`, `tags`, `altText`,
                    `canonicalUrl`, `isFeaturedHome`, `faqs`
                ) VALUES (
                    :id, :title, :summary, :content, :date, :category, :image,
                    :author, :slug, :metaTitle, :metaDescription, :tags, :altText,
                    :canonicalUrl, :isFeaturedHome, :faqs
                ) ON DUPLICATE KEY UPDATE
                    `title`=VALUES(`title`), `summary`=VALUES(`summary`), `content`=VALUES(`content`),
                    `date`=VALUES(`date`), `category`=VALUES(`category`), `image`=VALUES(`image`),
                    `author`=VALUES(`author`), `slug`=VALUES(`slug`), `metaTitle`=VALUES(`metaTitle`),
                    `metaDescription`=VALUES(`metaDescription`), `tags`=VALUES(`tags`), `altText`=VALUES(`altText`),
                    `canonicalUrl`=VALUES(`canonicalUrl`), `isFeaturedHome`=VALUES(`isFeaturedHome`), `faqs`=VALUES(`faqs`), `updated_at`=NOW()
            ");

            foreach ($data['blogs'] as $b) {
                if (empty($b['id'])) continue;
                $stmtBlog->execute([
                    ':id' => (string)$b['id'],
                    ':title' => $b['title'] ?? '',
                    ':summary' => $b['summary'] ?? '',
                    ':content' => $b['content'] ?? '',
                    ':date' => $b['date'] ?? '',
                    ':category' => $b['category'] ?? '',
                    ':image' => $b['image'] ?? '',
                    ':author' => $b['author'] ?? 'CBD American Shaman of Hurst Editorial Team',
                    ':slug' => $b['slug'] ?? (string)$b['id'],
                    ':metaTitle' => $b['metaTitle'] ?? '',
                    ':metaDescription' => $b['metaDescription'] ?? '',
                    ':tags' => is_string($b['tags'] ?? null) ? $b['tags'] : '',
                    ':altText' => $b['altText'] ?? '',
                    ':canonicalUrl' => $b['canonicalUrl'] ?? ('https://cbdhurst.com/blog/' . ($b['slug'] ?? (string)$b['id'])),
                    ':isFeaturedHome' => !empty($b['isFeaturedHome']) ? 1 : 0,
                    ':faqs' => json_encode($b['faqs'] ?? []),
                ]);
                $counts['blogs']++;
            }
        }

        // FAQs
        if (!empty($data['faqs']) && is_array($data['faqs'])) {
            $stmtFaq = $pdo->prepare("
                INSERT INTO `faqs` (`id`, `question`, `answer`, `category`)
                VALUES (:id, :question, :answer, :category)
                ON DUPLICATE KEY UPDATE
                    `question`=VALUES(`question`), `answer`=VALUES(`answer`), `category`=VALUES(`category`), `updated_at`=NOW()
            ");
            foreach ($data['faqs'] as $f) {
                if (empty($f['id'])) continue;
                $stmtFaq->execute([
                    ':id' => (string)$f['id'],
                    ':question' => $f['question'] ?? '',
                    ':answer' => $f['answer'] ?? '',
                    ':category' => $f['category'] ?? 'General',
                ]);
                $counts['faqs']++;
            }
        }

        // Reviews
        if (!empty($data['reviews']) && is_array($data['reviews'])) {
            $stmtRev = $pdo->prepare("
                INSERT INTO `reviews` (`id`, `productId`, `productName`, `author`, `rating`, `comment`, `title`, `date`, `status`, `verified`)
                VALUES (:id, :productId, :productName, :author, :rating, :comment, :title, :date, :status, :verified)
                ON DUPLICATE KEY UPDATE
                    `productName`=VALUES(`productName`), `author`=VALUES(`author`), `rating`=VALUES(`rating`),
                    `comment`=VALUES(`comment`), `title`=VALUES(`title`), `status`=VALUES(`status`),
                    `verified`=VALUES(`verified`)
            ");
            foreach ($data['reviews'] as $r) {
                if (empty($r['id'])) continue;
                $stmtRev->execute([
                    ':id' => (string)$r['id'],
                    ':productId' => (string)($r['productId'] ?? ''),
                    ':productName' => $r['productName'] ?? '',
                    ':author' => $r['author'] ?? 'Anonymous',
                    ':rating' => (float)($r['rating'] ?? 5),
                    ':comment' => $r['comment'] ?? '',
                    ':title' => $r['title'] ?? '',
                    ':date' => $r['date'] ?? date('M j, Y'),
                    ':status' => $r['status'] ?? 'approved',
                    ':verified' => isset($r['verified']) ? ($r['verified'] ? 1 : 0) : 1,
                ]);
                $counts['reviews']++;
            }
        }

        // Settings
        if (!empty($data['settings'])) {
            $stmtSet = $pdo->prepare("
                INSERT INTO `settings` (`id`, `data`)
                VALUES ('business_info', :data)
                ON DUPLICATE KEY UPDATE `data`=VALUES(`data`), `updated_at`=NOW()
            ");
            $stmtSet->execute([':data' => json_encode($data['settings'])]);
            $counts['settings'] = true;
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'counts' => $counts]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 2. SINGLE ITEM UPSERT
if ($postAction === 'upsert' || $postAction === 'insert' || $postAction === 'update') {
    if (!$postTable) {
        http_response_code(400);
        echo json_encode(['error' => 'Table parameter missing']);
        exit;
    }

    $item = $data['item'] ?? $data;
    if ($postTable === 'settings') {
        if (empty($item['id'])) {
            $item['id'] = 'business_info';
        }
    } else if (empty($item['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Item ID is required for upsert']);
        exit;
    }

    try {
        if ($postTable === 'products') {
            $stmt = $pdo->prepare("
                INSERT INTO `products` (
                    `id`, `name`, `slug`, `description`, `longDescription`, `price`, `category`,
                    `categories`, `categoryLabel`, `rating`, `image`, `thc`, `cbd`, `options`,
                    `benefits`, `labResults`, `reviewsCount`, `isBestSeller`, `isFeaturedHome`,
                    `isNew`, `metaTitle`, `metaDescription`, `tags`, `altText`
                ) VALUES (
                    :id, :name, :slug, :description, :longDescription, :price, :category,
                    :categories, :categoryLabel, :rating, :image, :thc, :cbd, :options,
                    :benefits, :labResults, :reviewsCount, :isBestSeller, :isFeaturedHome,
                    :isNew, :metaTitle, :metaDescription, :tags, :altText
                ) ON DUPLICATE KEY UPDATE
                    `name`=VALUES(`name`), `slug`=VALUES(`slug`), `description`=VALUES(`description`),
                    `longDescription`=VALUES(`longDescription`), `price`=VALUES(`price`), `category`=VALUES(`category`),
                    `categories`=VALUES(`categories`), `categoryLabel`=VALUES(`categoryLabel`), `rating`=VALUES(`rating`),
                    `image`=VALUES(`image`), `thc`=VALUES(`thc`), `cbd`=VALUES(`cbd`), `options`=VALUES(`options`),
                    `benefits`=VALUES(`benefits`), `labResults`=VALUES(`labResults`), `reviewsCount`=VALUES(`reviewsCount`),
                    `isBestSeller`=VALUES(`isBestSeller`), `isFeaturedHome`=VALUES(`isFeaturedHome`), `isNew`=VALUES(`isNew`),
                    `metaTitle`=VALUES(`metaTitle`), `metaDescription`=VALUES(`metaDescription`), `tags`=VALUES(`tags`),
                    `altText`=VALUES(`altText`), `updated_at`=NOW()
            ");

            $stmt->execute([
                ':id' => (string)$item['id'],
                ':name' => $item['name'] ?? 'Product',
                ':slug' => $item['slug'] ?? (string)$item['id'],
                ':description' => $item['description'] ?? '',
                ':longDescription' => $item['longDescription'] ?? $item['description'] ?? '',
                ':price' => (float)($item['price'] ?? 0),
                ':category' => $item['category'] ?? 'gummies',
                ':categories' => json_encode($item['categories'] ?? [$item['category'] ?? 'all']),
                ':categoryLabel' => $item['categoryLabel'] ?? '',
                ':rating' => (float)($item['rating'] ?? 5.0),
                ':image' => $item['image'] ?? '',
                ':thc' => $item['thc'] ?? '< 0.3% THC',
                ':cbd' => $item['cbd'] ?? '500mg CBD',
                ':options' => json_encode($item['options'] ?? []),
                ':benefits' => json_encode($item['benefits'] ?? []),
                ':labResults' => json_encode($item['labResults'] ?? new stdClass()),
                ':reviewsCount' => (int)($item['reviewsCount'] ?? 0),
                ':isBestSeller' => !empty($item['isBestSeller']) ? 1 : 0,
                ':isFeaturedHome' => !empty($item['isFeaturedHome']) ? 1 : (!empty($item['isBestSeller']) ? 1 : 0),
                ':isNew' => !empty($item['isNew']) ? 1 : 0,
                ':metaTitle' => $item['metaTitle'] ?? '',
                ':metaDescription' => $item['metaDescription'] ?? '',
                ':tags' => is_string($item['tags'] ?? null) ? $item['tags'] : '',
                ':altText' => $item['altText'] ?? '',
            ]);
            echo json_encode(['success' => true, 'id' => $item['id']]);
            exit;
        }

        if ($postTable === 'categories') {
            $stmt = $pdo->prepare("
                INSERT INTO `categories` (`id`, `title`, `tagline`, `desc`, `image`, `icon`, `showInMenu`, `isFeaturedHome`)
                VALUES (:id, :title, :tagline, :desc, :image, :icon, :showInMenu, :isFeaturedHome)
                ON DUPLICATE KEY UPDATE
                    `title`=VALUES(`title`), `tagline`=VALUES(`tagline`), `desc`=VALUES(`desc`),
                    `image`=VALUES(`image`), `icon`=VALUES(`icon`), `showInMenu`=VALUES(`showInMenu`),
                    `isFeaturedHome`=VALUES(`isFeaturedHome`), `updated_at`=NOW()
            ");
            $stmt->execute([
                ':id' => (string)$item['id'],
                ':title' => $item['title'] ?? '',
                ':tagline' => $item['tagline'] ?? '',
                ':desc' => $item['desc'] ?? '',
                ':image' => $item['image'] ?? '',
                ':icon' => $item['icon'] ?? '',
                ':showInMenu' => isset($item['showInMenu']) ? ($item['showInMenu'] ? 1 : 0) : 1,
                ':isFeaturedHome' => isset($item['isFeaturedHome']) ? ($item['isFeaturedHome'] ? 1 : 0) : 1,
            ]);
            echo json_encode(['success' => true, 'id' => $item['id']]);
            exit;
        }

        if ($postTable === 'blogs') {
            $stmt = $pdo->prepare("
                INSERT INTO `blogs` (
                    `id`, `title`, `summary`, `content`, `date`, `category`, `image`,
                    `author`, `slug`, `metaTitle`, `metaDescription`, `tags`, `altText`,
                    `canonicalUrl`, `isFeaturedHome`, `faqs`
                ) VALUES (
                    :id, :title, :summary, :content, :date, :category, :image,
                    :author, :slug, :metaTitle, :metaDescription, :tags, :altText,
                    :canonicalUrl, :isFeaturedHome, :faqs
                ) ON DUPLICATE KEY UPDATE
                    `title`=VALUES(`title`), `summary`=VALUES(`summary`), `content`=VALUES(`content`),
                    `date`=VALUES(`date`), `category`=VALUES(`category`), `image`=VALUES(`image`),
                    `author`=VALUES(`author`), `slug`=VALUES(`slug`), `metaTitle`=VALUES(`metaTitle`),
                    `metaDescription`=VALUES(`metaDescription`), `tags`=VALUES(`tags`), `altText`=VALUES(`altText`),
                    `canonicalUrl`=VALUES(`canonicalUrl`), `isFeaturedHome`=VALUES(`isFeaturedHome`), `faqs`=VALUES(`faqs`), `updated_at`=NOW()
            ");
            $stmt->execute([
                ':id' => (string)$item['id'],
                ':title' => $item['title'] ?? '',
                ':summary' => $item['summary'] ?? '',
                ':content' => $item['content'] ?? '',
                ':date' => $item['date'] ?? '',
                ':category' => $item['category'] ?? '',
                ':image' => $item['image'] ?? '',
                ':author' => $item['author'] ?? 'CBD American Shaman of Hurst Editorial Team',
                ':slug' => $item['slug'] ?? (string)$item['id'],
                ':metaTitle' => $item['metaTitle'] ?? '',
                ':metaDescription' => $item['metaDescription'] ?? '',
                ':tags' => is_string($item['tags'] ?? null) ? $item['tags'] : '',
                ':altText' => $item['altText'] ?? '',
                ':canonicalUrl' => $item['canonicalUrl'] ?? ('https://cbdhurst.com/blog/' . ($item['slug'] ?? (string)$item['id'])),
                ':isFeaturedHome' => !empty($item['isFeaturedHome']) ? 1 : 0,
                ':faqs' => json_encode($item['faqs'] ?? []),
            ]);
            echo json_encode(['success' => true, 'id' => $item['id']]);
            exit;
        }

        if ($postTable === 'faqs') {
            $stmt = $pdo->prepare("
                INSERT INTO `faqs` (`id`, `question`, `answer`, `category`)
                VALUES (:id, :question, :answer, :category)
                ON DUPLICATE KEY UPDATE
                    `question`=VALUES(`question`), `answer`=VALUES(`answer`), `category`=VALUES(`category`), `updated_at`=NOW()
            ");
            $stmt->execute([
                ':id' => (string)$item['id'],
                ':question' => $item['question'] ?? '',
                ':answer' => $item['answer'] ?? '',
                ':category' => $item['category'] ?? 'General',
            ]);
            echo json_encode(['success' => true, 'id' => $item['id']]);
            exit;
        }

        if ($postTable === 'orders') {
            $stmt = $pdo->prepare("
                INSERT INTO `orders` (
                    `id`, `customerName`, `customerEmail`, `customerPhone`, `shippingAddress`,
                    `customer`, `items`, `totalAmount`, `total`, `status`, `date`, `deliveryMethod`,
                    `paymentMethod`, `notes`
                ) VALUES (
                    :id, :customerName, :customerEmail, :customerPhone, :shippingAddress,
                    :customer, :items, :totalAmount, :total, :status, :date, :deliveryMethod,
                    :paymentMethod, :notes
                ) ON DUPLICATE KEY UPDATE
                    `customerName`=VALUES(`customerName`), `customerEmail`=VALUES(`customerEmail`),
                    `customerPhone`=VALUES(`customerPhone`), `shippingAddress`=VALUES(`shippingAddress`),
                    `customer`=VALUES(`customer`), `items`=VALUES(`items`), `totalAmount`=VALUES(`totalAmount`),
                    `total`=VALUES(`total`), `status`=VALUES(`status`), `deliveryMethod`=VALUES(`deliveryMethod`),
                    `paymentMethod`=VALUES(`paymentMethod`), `notes`=VALUES(`notes`), `updated_at`=NOW()
            ");

            $cust = $item['customer'] ?? [];
            $custName = $item['customerName'] ?? trim(($cust['firstName'] ?? '') . ' ' . ($cust['lastName'] ?? ''));
            $custEmail = $item['customerEmail'] ?? ($cust['email'] ?? '');
            $custPhone = $item['customerPhone'] ?? ($cust['phone'] ?? '');
            $shipping = $item['shippingAddress'] ?? ($cust['address'] ?? '');

            $stmt->execute([
                ':id' => (string)$item['id'],
                ':customerName' => $custName ?: 'Customer',
                ':customerEmail' => $custEmail ?: 'info@twobudz.com',
                ':customerPhone' => $custPhone ?: '',
                ':shippingAddress' => $shipping ?: '',
                ':customer' => json_encode($cust),
                ':items' => json_encode($item['items'] ?? []),
                ':totalAmount' => (float)($item['totalAmount'] ?? $item['total'] ?? 0),
                ':total' => (float)($item['total'] ?? $item['totalAmount'] ?? 0),
                ':status' => $item['status'] ?? 'pending',
                ':date' => $item['date'] ?? date('Y-m-d H:i:s'),
                ':deliveryMethod' => $item['deliveryMethod'] ?? 'shipping',
                ':paymentMethod' => $item['paymentMethod'] ?? 'cash_on_delivery',
                ':notes' => $item['notes'] ?? '',
            ]);

            // Automatically dispatch customer confirmation + owner notification emails!
            $emailResult = dispatchTwoBudzOrderEmails($item);

            echo json_encode(['success' => true, 'id' => $item['id'], 'emails' => $emailResult]);
            exit;
        }

        if ($postTable === 'inquiries') {
            $stmt = $pdo->prepare("
                INSERT INTO `inquiries` (`id`, `name`, `email`, `phone`, `message`, `msg`, `date`, `status`)
                VALUES (:id, :name, :email, :phone, :message, :msg, :date, :status)
                ON DUPLICATE KEY UPDATE
                    `name`=VALUES(`name`), `email`=VALUES(`email`), `phone`=VALUES(`phone`),
                    `message`=VALUES(`message`), `msg`=VALUES(`msg`), `status`=VALUES(`status`), `updated_at`=NOW()
            ");
            $msg = $item['message'] ?? $item['msg'] ?? '';
            $stmt->execute([
                ':id' => (string)$item['id'],
                ':name' => $item['name'] ?? '',
                ':email' => $item['email'] ?? '',
                ':phone' => $item['phone'] ?? '',
                ':message' => $msg,
                ':msg' => $msg,
                ':date' => $item['date'] ?? date('Y-m-d H:i:s'),
                ':status' => $item['status'] ?? 'new',
            ]);
            echo json_encode(['success' => true, 'id' => $item['id']]);
            exit;
        }

        if ($postTable === 'reviews') {
            $stmt = $pdo->prepare("
                INSERT INTO `reviews` (`id`, `productId`, `productName`, `author`, `rating`, `comment`, `title`, `date`, `status`, `verified`)
                VALUES (:id, :productId, :productName, :author, :rating, :comment, :title, :date, :status, :verified)
                ON DUPLICATE KEY UPDATE
                    `productName`=VALUES(`productName`), `author`=VALUES(`author`), `rating`=VALUES(`rating`),
                    `comment`=VALUES(`comment`), `title`=VALUES(`title`), `status`=VALUES(`status`),
                    `verified`=VALUES(`verified`)
            ");
            $stmt->execute([
                ':id' => (string)$item['id'],
                ':productId' => (string)($item['productId'] ?? ''),
                ':productName' => $item['productName'] ?? '',
                ':author' => $item['author'] ?? 'Anonymous',
                ':rating' => (float)($item['rating'] ?? 5),
                ':comment' => $item['comment'] ?? '',
                ':title' => $item['title'] ?? '',
                ':date' => $item['date'] ?? date('M j, Y'),
                ':status' => $item['status'] ?? 'approved',
                ':verified' => isset($item['verified']) ? ($item['verified'] ? 1 : 0) : 1,
            ]);
            echo json_encode(['success' => true, 'id' => $item['id']]);
            exit;
        }

        if ($postTable === 'settings') {
            $stmt = $pdo->prepare("
                INSERT INTO `settings` (`id`, `data`)
                VALUES ('business_info', :data)
                ON DUPLICATE KEY UPDATE `data`=VALUES(`data`), `updated_at`=NOW()
            ");
            $stmt->execute([':data' => json_encode($item)]);
            echo json_encode(['success' => true, 'id' => 'business_info']);
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => "Upsert not supported for table: {$postTable}"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// 3. DELETE ITEM
if ($postAction === 'delete') {
    $delId = $data['id'] ?? $data['key'] ?? null;
    if (!$postTable || !$delId) {
        http_response_code(400);
        echo json_encode(['error' => 'Table and ID required for deletion']);
        exit;
    }

    try {
        $validTables = ['products', 'categories', 'blogs', 'faqs', 'orders', 'inquiries', 'reviews'];
        if (!in_array($postTable, $validTables)) {
            http_response_code(400);
            echo json_encode(['error' => "Invalid table: {$postTable}"]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM `{$postTable}` WHERE `id` = ?");
        $stmt->execute([(string)$delId]);
        echo json_encode(['success' => true, 'deletedId' => $delId]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Fallback
echo json_encode([
    'status' => 'TwoBudz MySQL API is ready',
    'usage' => [
        'GET ?table=products|categories|blogs|faqs|orders|inquiries|reviews|settings|all',
        'GET ?action=health',
        'POST {action: "upsert", table: "...", data: {...}}',
        'POST {action: "delete", table: "...", data: {id: "..."}}',
        'POST {action: "seed_all", data: {products: [], categories: [], ...}}'
    ]
]);
