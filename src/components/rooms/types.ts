/**
 * Shared client-side types for the Room & Bed module. These mirror the JSON
 * payloads returned by the `/api/rooms` endpoints.
 */

export interface RoomCategoryDTO {
  id: string;
  roomType: string;
  totalRooms: number;
  bedsPerRoom: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface BedDTO {
  id: string;
  roomId: string;
  bedNumber: string;
  status: string;
  patientName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomDTO {
  id: string;
  categoryId: string;
  roomNumber: string;
  status: string;
  beds: BedDTO[];
}

export interface RoomCategoryDetailDTO extends RoomCategoryDTO {
  rooms: RoomDTO[];
}
