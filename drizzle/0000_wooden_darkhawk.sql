CREATE TABLE `Account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`creditLimit` integer,
	`expiryDate` integer,
	`meta` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `Account` (`userId`);--> statement-breakpoint
CREATE INDEX `account_type_idx` ON `Account` (`type`);--> statement-breakpoint
CREATE TABLE `Budget` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`categoryId` integer NOT NULL,
	`amount` integer NOT NULL,
	`period` text NOT NULL,
	`startDate` integer NOT NULL,
	`endDate` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_userId_idx` ON `Budget` (`userId`);--> statement-breakpoint
CREATE INDEX `budget_categoryId_idx` ON `Budget` (`categoryId`);--> statement-breakpoint
CREATE TABLE `Category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`parentId` integer,
	`icon` text,
	`color` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `category_userId_idx` ON `Category` (`userId`);--> statement-breakpoint
CREATE INDEX `category_type_idx` ON `Category` (`type`);--> statement-breakpoint
CREATE INDEX `category_parentId_idx` ON `Category` (`parentId`);--> statement-breakpoint
CREATE TABLE `Investment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`assetType` text NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`extra` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `investment_userId_idx` ON `Investment` (`userId`);--> statement-breakpoint
CREATE INDEX `investment_assetType_idx` ON `Investment` (`assetType`);--> statement-breakpoint
CREATE INDEX `investment_symbol_idx` ON `Investment` (`symbol`);--> statement-breakpoint
CREATE TABLE `LoanParty` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`note` text,
	`meta` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `loanParty_userId_idx` ON `LoanParty` (`userId`);--> statement-breakpoint
CREATE INDEX `loanParty_name_idx` ON `LoanParty` (`name`);--> statement-breakpoint
CREATE INDEX `loanParty_userId_name_unique` ON `LoanParty` (`userId`,`name`);--> statement-breakpoint
CREATE TABLE `RecurringTransaction` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`accountId` integer NOT NULL,
	`categoryId` integer,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`frequency` text NOT NULL,
	`nextDate` integer NOT NULL,
	`endDate` integer,
	`note` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `recurringTransaction_userId_idx` ON `RecurringTransaction` (`userId`);--> statement-breakpoint
CREATE INDEX `recurringTransaction_nextDate_idx` ON `RecurringTransaction` (`nextDate`);--> statement-breakpoint
CREATE TABLE `Transaction` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`accountId` integer NOT NULL,
	`toAccountId` integer,
	`type` text NOT NULL,
	`categoryId` integer,
	`investmentId` integer,
	`loanPartyId` integer,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`price` integer,
	`priceInBaseCurrency` integer,
	`quantity` integer,
	`fee` integer DEFAULT 0,
	`feeInBaseCurrency` integer,
	`date` integer NOT NULL,
	`dueDate` integer,
	`note` text,
	`receiptUrl` text,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`toAccountId`) REFERENCES `Account`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`investmentId`) REFERENCES `Investment`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`loanPartyId`) REFERENCES `LoanParty`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transaction_userId_idx` ON `Transaction` (`userId`);--> statement-breakpoint
CREATE INDEX `transaction_accountId_idx` ON `Transaction` (`accountId`);--> statement-breakpoint
CREATE INDEX `transaction_toAccountId_idx` ON `Transaction` (`toAccountId`);--> statement-breakpoint
CREATE INDEX `transaction_categoryId_idx` ON `Transaction` (`categoryId`);--> statement-breakpoint
CREATE INDEX `transaction_investmentId_idx` ON `Transaction` (`investmentId`);--> statement-breakpoint
CREATE INDEX `transaction_loanPartyId_idx` ON `Transaction` (`loanPartyId`);--> statement-breakpoint
CREATE INDEX `transaction_date_idx` ON `Transaction` (`date`);--> statement-breakpoint
CREATE INDEX `transaction_dueDate_idx` ON `Transaction` (`dueDate`);--> statement-breakpoint
CREATE INDEX `transaction_type_idx` ON `Transaction` (`type`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`baseCurrency` text DEFAULT 'VND' NOT NULL,
	`settings` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_username_unique` ON `User` (`username`);--> statement-breakpoint
CREATE INDEX `user_username_idx` ON `User` (`username`);