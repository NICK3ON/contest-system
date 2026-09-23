CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

ALTER TABLE "Contest"
ALTER COLUMN "difficulty" TYPE "Difficulty"
USING ("difficulty"::"Difficulty");

ALTER TABLE "Question"
ALTER COLUMN "difficulty" TYPE "Difficulty"
USING ("difficulty"::"Difficulty");
