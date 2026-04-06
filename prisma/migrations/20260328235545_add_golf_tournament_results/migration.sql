-- CreateTable
CREATE TABLE "GolfTournamentResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "isUserCut" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GolfTournamentResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GolfTournamentResult_tournamentId_idx" ON "GolfTournamentResult"("tournamentId");

-- CreateIndex
CREATE INDEX "GolfTournamentResult_userId_idx" ON "GolfTournamentResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GolfTournamentResult_userId_tournamentId_key" ON "GolfTournamentResult"("userId", "tournamentId");

-- AddForeignKey
ALTER TABLE "GolfTournamentResult" ADD CONSTRAINT "GolfTournamentResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GolfTournamentResult" ADD CONSTRAINT "GolfTournamentResult_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "GolfTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
