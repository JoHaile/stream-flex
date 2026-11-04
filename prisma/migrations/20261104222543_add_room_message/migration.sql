-- CreateTable
CREATE TABLE "room_message" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_message_roomId_createdAt_idx" ON "room_message"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "room_message" ADD CONSTRAINT "room_message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "cinema_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_message" ADD CONSTRAINT "room_message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
