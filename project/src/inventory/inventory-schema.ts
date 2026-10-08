import { z } from "zod";

export const GetInventoryParamsSchema = z.object({
  propertyId: z.string().uuid(),
});

export type GetInventoryParams = z.infer<typeof GetInventoryParamsSchema>;

export interface InventoryUnitResponse {
  unitId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  status: string;
  leaseRate: number | null;
}
