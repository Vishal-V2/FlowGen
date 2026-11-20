-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActionKey" ADD VALUE 'EXTRACT_LIST_TO_JSON';
ALTER TYPE "ActionKey" ADD VALUE 'SEND_CHAT_MESSAGE';
ALTER TYPE "ActionKey" ADD VALUE 'DELAY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskType" ADD VALUE 'EXTRACT_LIST_TO_JSON';
ALTER TYPE "TaskType" ADD VALUE 'SEND_CHAT_MESSAGE';
ALTER TYPE "TaskType" ADD VALUE 'DELAY';
