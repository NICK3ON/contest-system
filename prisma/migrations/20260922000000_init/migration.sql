-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIP', 'USER');
CREATE TYPE "ContestAccessLevel" AS ENUM ('NORMAL', 'VIP');
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_SELECT', 'MULTI_SELECT', 'TRUE_FALSE');
CREATE TYPE "ParticipationStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Contest" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "accessLevel" "ContestAccessLevel" NOT NULL DEFAULT 'NORMAL', "topic" TEXT NOT NULL, "difficulty" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL, "endTime" TIMESTAMP(3) NOT NULL, "prizeDescription" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Question" (
  "id" TEXT NOT NULL, "contestId" TEXT NOT NULL, "questionText" TEXT NOT NULL, "type" "QuestionType" NOT NULL,
  "difficulty" TEXT NOT NULL, "topic" TEXT NOT NULL, "explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuestionOption" (
  "id" TEXT NOT NULL, "questionId" TEXT NOT NULL, "optionText" TEXT NOT NULL, "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Participation" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "contestId" TEXT NOT NULL,
  "status" "ParticipationStatus" NOT NULL DEFAULT 'IN_PROGRESS', "score" INTEGER, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Answer" (
  "id" TEXT NOT NULL, "participationId" TEXT NOT NULL, "questionId" TEXT NOT NULL, "selectedOptions" JSONB NOT NULL,
  "isCorrect" BOOLEAN, "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Prize" (
  "id" TEXT NOT NULL, "contestId" TEXT NOT NULL, "userId" TEXT NOT NULL, "prizeDescription" TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Question_contestId_questionText_key" ON "Question"("contestId", "questionText");
CREATE UNIQUE INDEX "QuestionOption_questionId_optionText_key" ON "QuestionOption"("questionId", "optionText");
CREATE UNIQUE INDEX "Participation_userId_contestId_key" ON "Participation"("userId", "contestId");
CREATE UNIQUE INDEX "Answer_participationId_questionId_key" ON "Answer"("participationId", "questionId");
CREATE UNIQUE INDEX "Prize_contestId_key" ON "Prize"("contestId");
CREATE INDEX "Contest_startTime_endTime_idx" ON "Contest"("startTime", "endTime");
CREATE INDEX "Contest_accessLevel_idx" ON "Contest"("accessLevel");
CREATE INDEX "Contest_topic_idx" ON "Contest"("topic");
CREATE INDEX "Question_contestId_idx" ON "Question"("contestId");
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");
CREATE INDEX "Participation_contestId_status_idx" ON "Participation"("contestId", "status");
CREATE INDEX "Participation_userId_status_idx" ON "Participation"("userId", "status");
CREATE INDEX "Answer_participationId_idx" ON "Answer"("participationId");
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");
CREATE INDEX "Prize_userId_idx" ON "Prize"("userId");

ALTER TABLE "Contest" ADD CONSTRAINT "Contest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
