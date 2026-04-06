-- CreateEnum
CREATE TYPE "GolferGroup" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('MAJOR', 'PLAYERS');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "GolfTournament" (
    "id" TEXT NOT NULL,
    "espnId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tournamentType" "TournamentType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "season" INTEGER NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "cutLine" INTEGER,
    "winningScore" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfRound" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "roundDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoundStatus" NOT NULL DEFAULT 'NOT_STARTED',

    CONSTRAINT "GolfRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Golfer" (
    "id" TEXT NOT NULL,
    "espnId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "country" TEXT,
    "photoUrl" TEXT,

    CONSTRAINT "Golfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolferTournamentOdds" (
    "id" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "odds" INTEGER NOT NULL,
    "group" "GolferGroup" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolferTournamentOdds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfRoundScore" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "score" INTEGER,
    "totalScore" INTEGER,
    "position" INTEGER,
    "missedCut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GolfRoundScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "golferGroup" "GolferGroup" NOT NULL,
    "isUserCut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GolfPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfPickRoundPoints" (
    "id" TEXT NOT NULL,
    "pickId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "GolfPickRoundPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GolfTiebreaker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "predictedScore" INTEGER NOT NULL,

    CONSTRAINT "GolfTiebreaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GolfTournament_espnId_key" ON "GolfTournament"("espnId");

-- CreateIndex
CREATE INDEX "GolfTournament_season_idx" ON "GolfTournament"("season");

-- CreateIndex
CREATE INDEX "GolfTournament_status_idx" ON "GolfTournament"("status");

-- CreateIndex
CREATE INDEX "GolfRound_tournamentId_idx" ON "GolfRound"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "GolfRound_tournamentId_roundNumber_key" ON "GolfRound"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Golfer_espnId_key" ON "Golfer"("espnId");

-- CreateIndex
CREATE INDEX "Golfer_espnId_idx" ON "Golfer"("espnId");

-- CreateIndex
CREATE INDEX "GolferTournamentOdds_tournamentId_idx" ON "GolferTournamentOdds"("tournamentId");

-- CreateIndex
CREATE INDEX "GolferTournamentOdds_group_idx" ON "GolferTournamentOdds"("group");

-- CreateIndex
CREATE UNIQUE INDEX "GolferTournamentOdds_golferId_tournamentId_key" ON "GolferTournamentOdds"("golferId", "tournamentId");

-- CreateIndex
CREATE INDEX "GolfRoundScore_roundId_idx" ON "GolfRoundScore"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "GolfRoundScore_roundId_golferId_key" ON "GolfRoundScore"("roundId", "golferId");

-- CreateIndex
CREATE INDEX "GolfPick_userId_idx" ON "GolfPick"("userId");

-- CreateIndex
CREATE INDEX "GolfPick_tournamentId_idx" ON "GolfPick"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "GolfPick_userId_tournamentId_golferId_key" ON "GolfPick"("userId", "tournamentId", "golferId");

-- CreateIndex
CREATE INDEX "GolfPickRoundPoints_pickId_idx" ON "GolfPickRoundPoints"("pickId");

-- CreateIndex
CREATE UNIQUE INDEX "GolfPickRoundPoints_pickId_roundId_key" ON "GolfPickRoundPoints"("pickId", "roundId");

-- CreateIndex
CREATE INDEX "GolfTiebreaker_userId_idx" ON "GolfTiebreaker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GolfTiebreaker_userId_tournamentId_key" ON "GolfTiebreaker"("userId", "tournamentId");

-- AddForeignKey
ALTER TABLE "GolfRound" ADD CONSTRAINT "GolfRound_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "GolfTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolferTournamentOdds" ADD CONSTRAINT "GolferTournamentOdds_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "Golfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfRoundScore" ADD CONSTRAINT "GolfRoundScore_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GolfRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfRoundScore" ADD CONSTRAINT "GolfRoundScore_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "Golfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfPick" ADD CONSTRAINT "GolfPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfPick" ADD CONSTRAINT "GolfPick_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "GolfTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfPick" ADD CONSTRAINT "GolfPick_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "Golfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfPickRoundPoints" ADD CONSTRAINT "GolfPickRoundPoints_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "GolfPick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfPickRoundPoints" ADD CONSTRAINT "GolfPickRoundPoints_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GolfRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfTiebreaker" ADD CONSTRAINT "GolfTiebreaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
