-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('SUCCESS', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "maxRetry" INTEGER NOT NULL DEFAULT 3,
    "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "executionTime" TIMESTAMP(3) NOT NULL,
    "status" "LogStatus" NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
