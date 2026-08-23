CREATE TABLE `aiConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`domain` varchar(40) NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(120) NOT NULL,
	`resource` varchar(120),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cells` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`cellCode` varchar(40) NOT NULL,
	`technology` enum('2G','3G','4G','5G') NOT NULL,
	`availability` decimal(5,2),
	`congestion` decimal(5,2),
	`throughput` decimal(10,2),
	CONSTRAINT `cells_id` PRIMARY KEY(`id`),
	CONSTRAINT `cells_cellCode_unique` UNIQUE(`cellCode`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`siteId` int,
	`category` varchar(80) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`status` enum('open','in_progress','resolved') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalRef` varchar(80) NOT NULL,
	`segment` enum('consumer','enterprise','high_value') NOT NULL,
	`region` varchar(80),
	`churnRisk` decimal(5,2),
	`lifetimeValue` decimal(12,2),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_externalRef_unique` UNIQUE(`externalRef`)
);
--> statement-breakpoint
CREATE TABLE `dataSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`type` varchar(40) NOT NULL,
	`connectionRef` varchar(200),
	`status` varchar(40) NOT NULL DEFAULT 'pending',
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dataSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fiberInfrastructure` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeCode` varchar(40) NOT NULL,
	`region` varchar(80),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`availability` decimal(5,2),
	`status` varchar(40),
	CONSTRAINT `fiberInfrastructure_id` PRIMARY KEY(`id`),
	CONSTRAINT `fiberInfrastructure_nodeCode_unique` UNIQUE(`nodeCode`)
);
--> statement-breakpoint
CREATE TABLE `marketingCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`region` varchar(80),
	`status` varchar(40),
	`budget` decimal(12,2),
	`conversionRate` decimal(5,2),
	CONSTRAINT `marketingCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `networkKpis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`recordedAt` timestamp NOT NULL,
	`availability` decimal(5,2),
	`trafficTb` decimal(10,3),
	`congestion` decimal(5,2),
	`throughputMbps` decimal(10,2),
	CONSTRAINT `networkKpis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(120) NOT NULL,
	`description` text,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `revenues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(80),
	`period` varchar(20) NOT NULL,
	`actual` decimal(14,2),
	`atRisk` decimal(14,2),
	CONSTRAINT `revenues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rolePermissions` (
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`isSystem` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `salesOpportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`region` varchar(80),
	`stage` varchar(40),
	`value` decimal(12,2),
	`probability` decimal(5,2),
	CONSTRAINT `salesOpportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteCode` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`region` varchar(80),
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`status` enum('healthy','warning','degraded','critical') NOT NULL DEFAULT 'healthy',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_siteCode_unique` UNIQUE(`siteCode`)
);
