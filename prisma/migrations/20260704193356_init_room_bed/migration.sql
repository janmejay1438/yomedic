-- CreateTable
CREATE TABLE "RoomCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomType" TEXT NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "bedsPerRoom" INTEGER NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "availableBeds" INTEGER NOT NULL,
    "occupancyPercentage" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    CONSTRAINT "Room_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoomCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "patientName" TEXT,
    CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomCategory_roomType_key" ON "RoomCategory"("roomType");

-- CreateIndex
CREATE INDEX "Room_categoryId_idx" ON "Room"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_categoryId_roomNumber_key" ON "Room"("categoryId", "roomNumber");

-- CreateIndex
CREATE INDEX "Bed_roomId_idx" ON "Bed"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_roomId_bedNumber_key" ON "Bed"("roomId", "bedNumber");
