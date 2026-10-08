-- ========================================================
-- CBD American Shaman of Hurst Hostinger MySQL setup script
-- Database: `u554546348_cbdsouthlake`
-- User: `u554546348_cbdsouthlake`
-- ========================================================

-- 1. PRODUCTS TABLE
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
    `image` TEXT NULL,
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

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS `categories` (
    `id` VARCHAR(191) NOT NULL PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `tagline` TEXT NULL,
    `desc` TEXT NULL,
    `image` TEXT NULL,
    `icon` TEXT NULL,
    `showInMenu` TINYINT(1) DEFAULT 1,
    `isFeaturedHome` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BLOGS TABLE
CREATE TABLE IF NOT EXISTS `blogs` (
    `id` VARCHAR(191) NOT NULL PRIMARY KEY,
    `title` TEXT NOT NULL,
    `summary` MEDIUMTEXT NULL,
    `content` LONGTEXT NULL,
    `date` VARCHAR(100) NULL,
    `category` VARCHAR(100) NULL,
    `image` TEXT NULL,
    `author` VARCHAR(191) NULL,
    `slug` VARCHAR(255) NULL,
    `metaTitle` TEXT NULL,
    `metaDescription` TEXT NULL,
    `tags` TEXT NULL,
    `altText` TEXT NULL,
    `isFeaturedHome` TINYINT(1) DEFAULT 0,
    `faqs` JSON NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_blog_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. FAQS TABLE
CREATE TABLE IF NOT EXISTS `faqs` (
    `id` VARCHAR(191) NOT NULL PRIMARY KEY,
    `question` TEXT NOT NULL,
    `answer` MEDIUMTEXT NOT NULL,
    `category` VARCHAR(100) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ORDERS TABLE
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

-- 6. CUSTOMER INQUIRIES TABLE
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

-- 7. PRODUCT REVIEWS TABLE
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

-- 8. BUSINESS SETTINGS TABLE
CREATE TABLE IF NOT EXISTS `settings` (
    `id` VARCHAR(191) NOT NULL PRIMARY KEY DEFAULT 'business_info',
    `data` JSON NOT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`id`, `data`) VALUES (
    'business_info',
    '{"id":"business_info","phone":"+1 214-513-0100","email":"hello@twobudz.com","hours":"Monday - Friday: 10:30am - 7:30 pm | Saturday: 10:30am - 6:30 pm | Sunday: 11:00 am - 6:00 pm","location":"2001 Cross Timbers Rd #103, Flower Mound, TX 75028","heroBadge":"PREMIUM HEMP & CBD • FLOWER MOUND, TX","heroHeadingLine1":"Earthy Purity.","heroHeadingLine2":"Crafted Wellness & Relief.","heroParagraph":"Welcome to Two Budz, Flower Mound\'s trusted source for state-compliant, high-potency Delta-8, Delta-9, CBD Flowers, clean tinctures, and targeted comfort.","heroButtonPrimary":"EXPLORE PRODUCTS","heroButtonSecondary":"OUR STORY","heroImage":"/images/hero_bg_1779557711335.png","heroVerifiedText":"VERIFIED 100% LEGAL","heroWidget1Image":"/images/cbd_dropper_1779557730794.png","heroWidget1Label":"BEST SELLER","heroWidget1Title":"Organic CBD","heroWidget1Rating":"4.9","heroWidget2Image":"/images/thc_gummies_pack_1779557751523.png","heroWidget2Label":"POPULAR","heroWidget2Title":"Delta-9 Packs","heroWidget2Sub":"Pure Extraction","heroCommitmentLabel":"TWO BUDZ COMMITMENT","heroCommitmentTitle":"Small Business Owned","seoTitleOverride":"","seoDescriptionOverride":"","seoKeywordsOverride":"","urlShop":"shop","urlLearn":"learn","urlAbout":"about","urlFaq":"faq"}'
) ON DUPLICATE KEY UPDATE `id`=`id`;

UPDATE `settings`
SET `data` = JSON_SET(
    `data`,
    '$.phone', '+1 (817) 494-3335',
    '$.email', '',
    '$.location', '730 W Pipeline Rd, Hurst, TX 76053',
    '$.heroBadge', 'PREMIUM HEMP & CBD • HURST, TX',
    '$.heroParagraph', 'Welcome to CBD American Shaman of Hurst, your local source for hemp, CBD flowers, clean tinctures, and targeted comfort.',
    '$.heroCommitmentLabel', 'HURST STORE COMMITMENT'
)
WHERE `id` = 'business_info';

