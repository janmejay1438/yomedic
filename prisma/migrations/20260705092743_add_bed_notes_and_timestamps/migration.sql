-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "patientName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Bed" ("bedNumber", "id", "patientName", "roomId", "status") SELECT "bedNumber", "id", "patientName", "roomId", "status" FROM "Bed";
DROP TABLE "Bed";
ALTER TABLE "new_Bed" RENAME TO "Bed";
CREATE INDEX "Bed_roomId_idx" ON "Bed"("roomId");
CREATE UNIQUE INDEX "Bed_roomId_bedNumber_key" ON "Bed"("roomId", "bedNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
