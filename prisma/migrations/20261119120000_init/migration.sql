-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppSetting` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Objective` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Initiative` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `objectiveId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Initiative_objectiveId_idx`(`objectiveId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subarea` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Subarea_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceFamily` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ServiceFamily_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `system` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ActivityType_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Person` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `subareaId` VARCHAR(191) NULL,
    `serviceFamilyId` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NULL,

    UNIQUE INDEX `Person_accountId_key`(`accountId`),
    INDEX `Person_subareaId_idx`(`subareaId`),
    INDEX `Person_serviceFamilyId_idx`(`serviceFamilyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JiraProject` (
    `id` VARCHAR(191) NOT NULL,
    `jiraId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `activeInJira` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `JiraProject_jiraId_key`(`jiraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Board` (
    `id` VARCHAR(191) NOT NULL,
    `jiraId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `projectKey` VARCHAR(191) NULL,
    `activeInJira` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Board_jiraId_key`(`jiraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sprint` (
    `id` VARCHAR(191) NOT NULL,
    `jiraId` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `activeInJira` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Sprint_jiraId_key`(`jiraId`),
    INDEX `Sprint_boardId_idx`(`boardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Epic` (
    `id` VARCHAR(191) NOT NULL,
    `jiraIssueId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `statusName` VARCHAR(191) NOT NULL,
    `statusCategory` VARCHAR(191) NOT NULL,
    `assigneeAccountId` VARCHAR(191) NULL,
    `assigneeName` VARCHAR(191) NULL,
    `initiativeId` VARCHAR(191) NULL,
    `objectiveId` VARCHAR(191) NULL,
    `objectiveExplicit` BOOLEAN NOT NULL DEFAULT false,
    `maintenanceType` ENUM('ADAPTIVE', 'CORRECTIVE', 'EVOLUTIVE') NULL,
    `activityTypeId` VARCHAR(191) NULL,
    `originalSeconds` INTEGER NOT NULL DEFAULT 0,
    `spentSeconds` INTEGER NOT NULL DEFAULT 0,
    `remainingSeconds` INTEGER NOT NULL DEFAULT 0,
    `storyPoints` DOUBLE NULL,
    `jiraUrl` VARCHAR(191) NOT NULL,
    `activeInJira` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Epic_jiraIssueId_key`(`jiraIssueId`),
    INDEX `Epic_key_idx`(`key`),
    INDEX `Epic_initiativeId_idx`(`initiativeId`),
    INDEX `Epic_activityTypeId_idx`(`activityTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Issue` (
    `id` VARCHAR(191) NOT NULL,
    `jiraIssueId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `issueType` VARCHAR(191) NOT NULL,
    `kind` ENUM('EPIC', 'STORY', 'TASK', 'OTHER') NOT NULL,
    `statusName` VARCHAR(191) NOT NULL,
    `statusCategory` VARCHAR(191) NOT NULL,
    `epicId` VARCHAR(191) NULL,
    `epicResolution` ENUM('PARENT', 'EPIC_LINK', 'HIERARCHY', 'UNRESOLVED') NOT NULL,
    `assigneeId` VARCHAR(191) NULL,
    `currentSprintId` VARCHAR(191) NULL,
    `inBacklog` BOOLEAN NOT NULL DEFAULT false,
    `originalSeconds` INTEGER NOT NULL DEFAULT 0,
    `spentSeconds` INTEGER NOT NULL DEFAULT 0,
    `remainingSeconds` INTEGER NOT NULL DEFAULT 0,
    `storyPoints` DOUBLE NULL,
    `createdAtJira` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `jiraUrl` VARCHAR(191) NOT NULL,
    `activeInJira` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Issue_jiraIssueId_key`(`jiraIssueId`),
    INDEX `Issue_key_idx`(`key`),
    INDEX `Issue_epicId_idx`(`epicId`),
    INDEX `Issue_kind_idx`(`kind`),
    INDEX `Issue_statusCategory_idx`(`statusCategory`),
    INDEX `Issue_assigneeId_idx`(`assigneeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IssueSprint` (
    `issueId` VARCHAR(191) NOT NULL,
    `sprintId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`issueId`, `sprintId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Worklog` (
    `id` VARCHAR(191) NOT NULL,
    `jiraId` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `seconds` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `sprintId` VARCHAR(191) NULL,

    UNIQUE INDEX `Worklog_jiraId_key`(`jiraId`),
    INDEX `Worklog_issueId_idx`(`issueId`),
    INDEX `Worklog_accountId_idx`(`accountId`),
    INDEX `Worklog_sprintId_idx`(`sprintId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImpulsiveDemand` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `requester` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `estimatedHours` DOUBLE NOT NULL DEFAULT 0,
    `initiativeId` VARCHAR(191) NULL,
    `objectiveId` VARCHAR(191) NULL,
    `subareaId` VARCHAR(191) NULL,
    `serviceFamilyId` VARCHAR(191) NULL,
    `status` ENUM('NEW', 'TRIAGED', 'IN_PROGRESS', 'DONE', 'DISCARDED') NOT NULL DEFAULT 'NEW',
    `epicId` VARCHAR(191) NULL,
    `jiraKey` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ImpulsiveDemand_occurredAt_idx`(`occurredAt`),
    INDEX `ImpulsiveDemand_initiativeId_idx`(`initiativeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncRun` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('RUNNING', 'SUCCESS', 'FAILED') NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `stats` JSON NULL,

    INDEX `SyncRun_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailDispatch` (
    `id` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recipient` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `issueCount` INTEGER NOT NULL,
    `result` ENUM('SENT', 'DRY_RUN', 'FAILED') NOT NULL,
    `error` TEXT NULL,
    `kinds` VARCHAR(191) NOT NULL,

    INDEX `EmailDispatch_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Initiative` ADD CONSTRAINT `Initiative_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `Objective`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Person` ADD CONSTRAINT `Person_subareaId_fkey` FOREIGN KEY (`subareaId`) REFERENCES `Subarea`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Person` ADD CONSTRAINT `Person_serviceFamilyId_fkey` FOREIGN KEY (`serviceFamilyId`) REFERENCES `ServiceFamily`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sprint` ADD CONSTRAINT `Sprint_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Epic` ADD CONSTRAINT `Epic_initiativeId_fkey` FOREIGN KEY (`initiativeId`) REFERENCES `Initiative`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Epic` ADD CONSTRAINT `Epic_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `Objective`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Epic` ADD CONSTRAINT `Epic_activityTypeId_fkey` FOREIGN KEY (`activityTypeId`) REFERENCES `ActivityType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Issue` ADD CONSTRAINT `Issue_epicId_fkey` FOREIGN KEY (`epicId`) REFERENCES `Epic`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Issue` ADD CONSTRAINT `Issue_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `Person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Issue` ADD CONSTRAINT `Issue_currentSprintId_fkey` FOREIGN KEY (`currentSprintId`) REFERENCES `Sprint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueSprint` ADD CONSTRAINT `IssueSprint_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `Issue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueSprint` ADD CONSTRAINT `IssueSprint_sprintId_fkey` FOREIGN KEY (`sprintId`) REFERENCES `Sprint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Worklog` ADD CONSTRAINT `Worklog_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `Issue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Worklog` ADD CONSTRAINT `Worklog_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Worklog` ADD CONSTRAINT `Worklog_sprintId_fkey` FOREIGN KEY (`sprintId`) REFERENCES `Sprint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpulsiveDemand` ADD CONSTRAINT `ImpulsiveDemand_initiativeId_fkey` FOREIGN KEY (`initiativeId`) REFERENCES `Initiative`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpulsiveDemand` ADD CONSTRAINT `ImpulsiveDemand_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `Objective`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpulsiveDemand` ADD CONSTRAINT `ImpulsiveDemand_subareaId_fkey` FOREIGN KEY (`subareaId`) REFERENCES `Subarea`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpulsiveDemand` ADD CONSTRAINT `ImpulsiveDemand_serviceFamilyId_fkey` FOREIGN KEY (`serviceFamilyId`) REFERENCES `ServiceFamily`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpulsiveDemand` ADD CONSTRAINT `ImpulsiveDemand_epicId_fkey` FOREIGN KEY (`epicId`) REFERENCES `Epic`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailDispatch` ADD CONSTRAINT `EmailDispatch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
