ALTER TABLE "Answer" DROP CONSTRAINT "Answer_questionId_fkey";

ALTER TABLE "Answer"
ADD CONSTRAINT "Answer_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
