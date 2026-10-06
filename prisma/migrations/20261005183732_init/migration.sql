-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('ACTIVATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('ACTIVATION', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'SENSITIVE_ACTION');

-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('FULL', 'SETUP');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STANDARD', 'CAKE', 'BEVERAGE', 'SEASONAL');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'ONLINE', 'COD');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "CustomCakeStatus" AS ENUM ('REQUESTED', 'REVIEWING', 'QUOTED', 'CUSTOMER_APPROVED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EggPreference" AS ENUM ('EGG', 'EGGLESS', 'NO_PREFERENCE');

-- CreateEnum
CREATE TYPE "InventoryMovement" AS ENUM ('IN', 'OUT', 'WASTE', 'ADJUSTMENT', 'PURCHASE', 'CONSUMPTION');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY', 'PRODUCT', 'CATEGORY');

-- CreateEnum
CREATE TYPE "StackingPolicy" AS ENUM ('EXCLUSIVE', 'STACKABLE');

-- CreateEnum
CREATE TYPE "LoyaltyType" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST');

-- CreateEnum
CREATE TYPE "SettingGroup" AS ENUM ('GENERAL', 'STORE', 'ORDER', 'DELIVERY', 'PAYMENT', 'EMAIL', 'SECURITY', 'OTP', 'LOYALTY', 'TAX', 'NOTIFICATIONS', 'MODULES');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_change_required" BOOLEAN NOT NULL DEFAULT false,
    "user_version" INTEGER NOT NULL DEFAULT 1,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_version" INTEGER NOT NULL,
    "kind" "SessionKind" NOT NULL DEFAULT 'FULL',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "user_id" UUID,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birthday" DATE,
    "preferences" TEXT,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_key" TEXT,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'STANDARD',
    "price" DECIMAL(12,2) NOT NULL,
    "sale_price" DECIMAL(12,2),
    "cost_price" DECIMAL(12,2),
    "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "track_stock" BOOLEAN NOT NULL DEFAULT false,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "preparation_minutes" INTEGER NOT NULL DEFAULT 30,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "bestseller" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "sale_price" DECIMAL(12,2),
    "cost_price" DECIMAL(12,2),
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "r2_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_ingredients" (
    "product_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("product_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_sequences" (
    "date_key" TEXT NOT NULL,
    "last" INTEGER NOT NULL,

    CONSTRAINT "order_sequences_pkey" PRIMARY KEY ("date_key")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillment" "FulfillmentType" NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "notes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "coupon_code" TEXT,
    "promotion_id" UUID,
    "address_snapshot" JSONB,
    "pricing_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "cost_snapshot" DECIMAL(12,2),
    "customization" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_options" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "order_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_cake_requests" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "occasion" TEXT NOT NULL,
    "cake_type" TEXT NOT NULL,
    "flavor" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "weight" TEXT,
    "egg_preference" "EggPreference" NOT NULL DEFAULT 'NO_PREFERENCE',
    "filling" TEXT,
    "frosting" TEXT,
    "message" TEXT,
    "topper" TEXT,
    "reference_image_key" TEXT,
    "reference_image_url" TEXT,
    "fulfillment" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "special_instructions" TEXT,
    "estimated_price" DECIMAL(12,2),
    "final_price" DECIMAL(12,2),
    "assigned_staff_id" UUID,
    "status" "CustomCakeStatus" NOT NULL DEFAULT 'REQUESTED',
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_cake_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_units" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ingredient_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit_id" UUID NOT NULL,
    "on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reorder_point" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "cost_per_unit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "type" "InventoryMovement" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "on_hand_after" DECIMAL(12,3) NOT NULL,
    "note" TEXT,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "ordered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "order_item_id" UUID,
    "product_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "admin_response" TEXT,
    "responder_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stacking" "StackingPolicy" NOT NULL DEFAULT 'EXCLUSIVE',
    "auto_apply" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "per_customer_limit" INTEGER,
    "minimum_order" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_products" (
    "promotion_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("promotion_id","product_id")
);

-- CreateTable
CREATE TABLE "promotion_categories" (
    "promotion_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "promotion_categories_pkey" PRIMARY KEY ("promotion_id","category_id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "promotion_id" UUID NOT NULL,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usage" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "coupon_id" UUID,
    "customer_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" "LoyaltyType" NOT NULL,
    "points" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "order_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "group" "SettingGroup" NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "password_history_user_id_created_at_idx" ON "password_history"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "otp_requests_user_id_purpose_created_at_idx" ON "otp_requests"("user_id", "purpose", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_purpose_idx" ON "auth_tokens"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "login_attempts_username_created_at_idx" ON "login_attempts"("username", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_created_at_idx" ON "login_attempts"("ip", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE INDEX "customer_notes_customer_id_idx" ON "customer_notes"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_is_active_sort_order_idx" ON "categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_status_featured_idx" ON "products"("status", "featured");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_media_product_id_sort_order_idx" ON "product_media"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "carts_customer_id_idx" ON "carts"("customer_id");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_item_options_order_item_id_idx" ON "order_item_options"("order_item_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "custom_cake_requests_customer_id_idx" ON "custom_cake_requests"("customer_id");

-- CreateIndex
CREATE INDEX "custom_cake_requests_status_scheduled_at_idx" ON "custom_cake_requests"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_units_code_key" ON "ingredient_units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_sku_key" ON "ingredients"("sku");

-- CreateIndex
CREATE INDEX "ingredients_name_idx" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "inventory_transactions_ingredient_id_created_at_idx" ON "inventory_transactions"("ingredient_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_transactions_type_created_at_idx" ON "inventory_transactions"("type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_number_key" ON "purchase_orders"("number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_item_id_key" ON "reviews"("order_item_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_status_idx" ON "reviews"("product_id", "status");

-- CreateIndex
CREATE INDEX "reviews_status_created_at_idx" ON "reviews"("status", "created_at");

-- CreateIndex
CREATE INDEX "promotions_active_starts_at_ends_at_idx" ON "promotions"("active", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_promotion_id_idx" ON "coupons"("promotion_id");

-- CreateIndex
CREATE INDEX "promotion_usage_promotion_id_customer_id_idx" ON "promotion_usage"("promotion_id", "customer_id");

-- CreateIndex
CREATE INDEX "promotion_usage_coupon_id_idx" ON "promotion_usage"("coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_customer_id_key" ON "loyalty_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "loyalty_transactions_account_id_created_at_idx" ON "loyalty_transactions"("account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "settings_group_idx" ON "settings"("group");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_requests" ADD CONSTRAINT "otp_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_options" ADD CONSTRAINT "order_item_options_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_cake_requests" ADD CONSTRAINT "custom_cake_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_cake_requests" ADD CONSTRAINT "custom_cake_requests_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "ingredient_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_categories" ADD CONSTRAINT "promotion_categories_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_categories" ADD CONSTRAINT "promotion_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usage" ADD CONSTRAINT "promotion_usage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
