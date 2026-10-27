CREATE TABLE `Account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Account_userId_idx` ON `Account` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Account_provider_account_idx` ON `Account` (`providerId`,`accountId`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Session_token_unique` ON `Session` (`token`);--> statement-breakpoint
CREATE INDEX `Session_userId_idx` ON `Session` (`userId`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);--> statement-breakpoint
CREATE TABLE `Verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Customer` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`country` text NOT NULL,
	`marketingConsentAt` integer,
	`unsubscribedAt` integer,
	`lettersStoppedAt` integer,
	`lettersStoppedReason` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Customer_user_email_key` ON `Customer` (`userId`,`email`);--> statement-breakpoint
CREATE TABLE `Letter` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`customerId` text NOT NULL,
	`status` text NOT NULL,
	`sendOn` text NOT NULL,
	`timingReason` text NOT NULL,
	`productId` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`editedByOwner` integer DEFAULT false NOT NULL,
	`sentAt` integer,
	`clickedAt` integer,
	`paidAt` integer,
	`paypalOrderId` text,
	`checkoutUnitMinor` integer,
	`paypalCaptureId` text,
	`paypalCaptureStatus` text,
	`paidMinor` integer,
	`error` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Letter_user_status_sendOn_idx` ON `Letter` (`userId`,`status`,`sendOn`);--> statement-breakpoint
CREATE INDEX `Letter_customer_createdAt_idx` ON `Letter` (`customerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Letter_status_sendOn_idx` ON `Letter` (`status`,`sendOn`);--> statement-breakpoint
CREATE TABLE `Product` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`size` text NOT NULL,
	`priceMinor` integer NOT NULL,
	`stock` integer NOT NULL,
	`arrivedOn` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Product_user_idx` ON `Product` (`userId`);--> statement-breakpoint
CREATE TABLE `Purchase` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`customerId` text NOT NULL,
	`productId` text NOT NULL,
	`quantity` integer NOT NULL,
	`unitPriceMinor` integer NOT NULL,
	`source` text NOT NULL,
	`letterId` text,
	`purchasedAt` integer NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Purchase_customer_purchasedAt_idx` ON `Purchase` (`customerId`,`purchasedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `Purchase_letter_key` ON `Purchase` (`letterId`);--> statement-breakpoint
CREATE TABLE `Shop` (
	`userId` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`payeeEmail` text NOT NULL,
	`currency` text NOT NULL,
	`shippingMinor` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
