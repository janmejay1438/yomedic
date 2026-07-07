-- CreateTable
CREATE TABLE "blood_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blood_type" TEXT NOT NULL,
    "quantity_units" INTEGER NOT NULL DEFAULT 0,
    "collection_date" TEXT,
    "expiry_date" TEXT,
    "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "arrival_date" TEXT NOT NULL,
    "stock_arrived" INTEGER NOT NULL,
    "stock_left" INTEGER NOT NULL,
    "expiry_date" TEXT NOT NULL,
    "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registration_date" TEXT NOT NULL,
    "visit_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "consulting_doctor" TEXT NOT NULL,
    "updated_at" TEXT DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patients_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staff_sections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "staff_departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    CONSTRAINT "staff_members_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "staff_sections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "staff_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "staff_departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staff_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "attendance_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    CONSTRAINT "rooms_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "room_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "room_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "queries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "blood_inventory_blood_type_key" ON "blood_inventory"("blood_type");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_sections_name_key" ON "staff_sections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_departments_name_key" ON "staff_departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_staff_id_date_key" ON "attendance_records"("staff_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "room_categories_name_key" ON "room_categories"("name");
