-- CreateEnum
CREATE TYPE "CriteriaType" AS ENUM ('COST', 'BENEFIT');

-- CreateEnum
CREATE TYPE "DssMethodType" AS ENUM ('WP', 'SAW', 'TOPSIS');

-- CreateTable
CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Topic" (
    "topicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("topicId")
);

-- CreateTable
CREATE TABLE "Criteria" (
    "criteriaId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CriteriaType" NOT NULL DEFAULT 'BENEFIT',
    "weight" DOUBLE PRECISION NOT NULL,
    "parentCriteriaId" INTEGER,
    "topicId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Criteria_pkey" PRIMARY KEY ("criteriaId")
);

-- CreateTable
CREATE TABLE "Dss" (
    "dssId" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "method" "DssMethodType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dss_pkey" PRIMARY KEY ("dssId")
);

-- CreateTable
CREATE TABLE "DssAlternative" (
    "dssAlternativeId" SERIAL NOT NULL,
    "dssId" INTEGER NOT NULL,
    "alternativeName" TEXT NOT NULL,
    "sValue" DOUBLE PRECISION NOT NULL,
    "rankValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DssAlternative_pkey" PRIMARY KEY ("dssAlternativeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_userId_key" ON "Topic"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Criteria_parentCriteriaId_key" ON "Criteria"("parentCriteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Criteria_topicId_key" ON "Criteria"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Dss_topicId_key" ON "Dss"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "DssAlternative_dssId_key" ON "DssAlternative"("dssId");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criteria" ADD CONSTRAINT "Criteria_parentCriteriaId_fkey" FOREIGN KEY ("parentCriteriaId") REFERENCES "Criteria"("criteriaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criteria" ADD CONSTRAINT "Criteria_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("topicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dss" ADD CONSTRAINT "Dss_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("topicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DssAlternative" ADD CONSTRAINT "DssAlternative_dssId_fkey" FOREIGN KEY ("dssId") REFERENCES "Dss"("dssId") ON DELETE RESTRICT ON UPDATE CASCADE;
