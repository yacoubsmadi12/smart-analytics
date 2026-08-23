CREATE TABLE `importRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int,
	`userId` int,
	`method` varchar(24) NOT NULL,
	`fileName` varchar(255),
	`status` enum('received','validated','rejected','processed') NOT NULL DEFAULT 'received',
	`rowCount` int NOT NULL DEFAULT 0,
	`validRows` int NOT NULL DEFAULT 0,
	`invalidRows` int NOT NULL DEFAULT 0,
	`schemaJson` text,
	`errorsJson` text,
	`storageKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sourceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`importRunId` int NOT NULL,
	`recordKey` varchar(120),
	`payloadJson` text NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sourceRecords_id` PRIMARY KEY(`id`)
);
