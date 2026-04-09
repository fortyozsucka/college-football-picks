-- CreateEnum
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SideBetType') THEN
  CREATE TYPE "SideBetType" AS ENUM ('SPREAD', 'OVER_UNDER');
 END IF;
END $$;

-- CreateEnum  
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SideBetStatus') THEN
  CREATE TYPE "SideBetStatus" AS ENUM ('OPEN', 'ACCEPTED', 'COMPLETED', 'CANCELLED');
 END IF;
END $$;

-- AlterTable
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'venmoHandle') THEN
  ALTER TABLE "User" ADD COLUMN "venmoHandle" TEXT;
 END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameStartReminders" BOOLEAN NOT NULL DEFAULT true,
    "gameResults" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardUpdates" BOOLEAN NOT NULL DEFAULT true,
    "weeklyRecaps" BOOLEAN NOT NULL DEFAULT true,
    "friendActivity" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SideBet" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "betType" "SideBetType" NOT NULL,
    "betSide" TEXT NOT NULL,
    "customLine" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "maxAcceptors" INTEGER,
    "status" "SideBetStatus" NOT NULL DEFAULT 'OPEN',
    "winningSide" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SideBetAcceptance" (
    "id" TEXT NOT NULL,
    "sideBetId" TEXT NOT NULL,
    "acceptorId" TEXT NOT NULL,
    "isWinner" BOOLEAN,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SideBetAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PushSubscription_userId_endpoint_key') THEN
  CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");
 END IF;
END $$;

-- CreateIndex  
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PushSubscription_userId_idx') THEN
  CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
 END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'NotificationPreferences_userId_key') THEN
  CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");
 END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SideBet_gameId_idx') THEN
  CREATE INDEX "SideBet_gameId_idx" ON "SideBet"("gameId");
 END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SideBet_proposerId_idx') THEN
  CREATE INDEX "SideBet_proposerId_idx" ON "SideBet"("proposerId");
 END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SideBet_status_idx') THEN
  CREATE INDEX "SideBet_status_idx" ON "SideBet"("status");
 END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SideBetAcceptance_sideBetId_acceptorId_key') THEN
  CREATE UNIQUE INDEX "SideBetAcceptance_sideBetId_acceptorId_key" ON "SideBetAcceptance"("sideBetId", "acceptorId");
 END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SideBetAcceptance_sideBetId_idx') THEN
  CREATE INDEX "SideBetAcceptance_sideBetId_idx" ON "SideBetAcceptance"("sideBetId");
 END IF;
END $$;

-- CreateIndex
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SideBetAcceptance_acceptorId_idx') THEN
  CREATE INDEX "SideBetAcceptance_acceptorId_idx" ON "SideBetAcceptance"("acceptorId");
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PushSubscription_userId_fkey') THEN
  ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'NotificationPreferences_userId_fkey') THEN
  ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SideBet_gameId_fkey') THEN
  ALTER TABLE "SideBet" ADD CONSTRAINT "SideBet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SideBet_proposerId_fkey') THEN
  ALTER TABLE "SideBet" ADD CONSTRAINT "SideBet_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SideBetAcceptance_sideBetId_fkey') THEN
  ALTER TABLE "SideBetAcceptance" ADD CONSTRAINT "SideBetAcceptance_sideBetId_fkey" FOREIGN KEY ("sideBetId") REFERENCES "SideBet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SideBetAcceptance_acceptorId_fkey') THEN
  ALTER TABLE "SideBetAcceptance" ADD CONSTRAINT "SideBetAcceptance_acceptorId_fkey" FOREIGN KEY ("acceptorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;