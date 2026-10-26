CREATE TABLE `Account` (
	`id` varchar(191) NOT NULL,
	`accountId` varchar(191) NOT NULL,
	`providerId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` datetime(3),
	`refreshTokenExpiresAt` datetime(3),
	`scope` text,
	`password` text,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `Account_id` PRIMARY KEY(`id`),
	CONSTRAINT `Account_provider_account_idx` UNIQUE(`providerId`,`accountId`)
);
--> statement-breakpoint
CREATE TABLE `Session` (
	`id` varchar(191) NOT NULL,
	`expiresAt` datetime(3) NOT NULL,
	`token` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`ipAddress` text,
	`userAgent` text,
	`userId` varchar(191) NOT NULL,
	CONSTRAINT `Session_id` PRIMARY KEY(`id`),
	CONSTRAINT `Session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`emailVerified` boolean NOT NULL DEFAULT false,
	`image` text,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `Verification` (
	`id` varchar(191) NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`value` text NOT NULL,
	`expiresAt` datetime(3) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `Verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Customer` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(191) NOT NULL,
	`country` varchar(2) NOT NULL,
	`marketingConsentAt` datetime(3),
	`unsubscribedAt` datetime(3),
	`lettersStoppedAt` datetime(3),
	`lettersStoppedReason` text,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `Customer_id` PRIMARY KEY(`id`),
	CONSTRAINT `Customer_user_email_key` UNIQUE(`userId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `Letter` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`customerId` varchar(191) NOT NULL,
	`status` varchar(16) NOT NULL,
	`sendOn` date NOT NULL,
	`timingReason` text NOT NULL,
	`productId` varchar(191) NOT NULL,
	`quantity` int NOT NULL,
	`reason` text NOT NULL,
	`editedByOwner` boolean NOT NULL DEFAULT false,
	`sentAt` datetime(3),
	`clickedAt` datetime(3),
	`paidAt` datetime(3),
	`paypalOrderId` varchar(64),
	`checkoutUnitMinor` int,
	`paypalCaptureId` varchar(64),
	`paidMinor` int,
	`error` varchar(500),
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `Letter_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Product` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`origin` varchar(120) NOT NULL,
	`roast` varchar(16) NOT NULL,
	`notes` text NOT NULL,
	`bagGrams` int NOT NULL,
	`priceMinor` int NOT NULL,
	`stock` int NOT NULL,
	`arrivedOn` date NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `Product_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Purchase` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`customerId` varchar(191) NOT NULL,
	`productId` varchar(191) NOT NULL,
	`quantity` int NOT NULL,
	`unitPriceMinor` int NOT NULL,
	`source` varchar(16) NOT NULL,
	`letterId` varchar(191),
	`purchasedAt` datetime(3) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `Purchase_id` PRIMARY KEY(`id`),
	CONSTRAINT `Purchase_letter_key` UNIQUE(`letterId`)
);
--> statement-breakpoint
CREATE TABLE `Shop` (
	`userId` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`payeeEmail` varchar(191) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`shippingMinor` int NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `Shop_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE INDEX `Account_userId_idx` ON `Account` (`userId`);--> statement-breakpoint
CREATE INDEX `Session_userId_idx` ON `Session` (`userId`);--> statement-breakpoint
CREATE INDEX `Letter_user_status_sendOn_idx` ON `Letter` (`userId`,`status`,`sendOn`);--> statement-breakpoint
CREATE INDEX `Letter_customer_createdAt_idx` ON `Letter` (`customerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Letter_status_sendOn_idx` ON `Letter` (`status`,`sendOn`);--> statement-breakpoint
CREATE INDEX `Product_user_idx` ON `Product` (`userId`);--> statement-breakpoint
CREATE INDEX `Purchase_customer_purchasedAt_idx` ON `Purchase` (`customerId`,`purchasedAt`);