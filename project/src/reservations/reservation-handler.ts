import { z } from "zod";
import { registerEndpoint, type EndpointRequest, type EndpointResponse } from "../framework/dispatcher";
import { ConflictError, NotFoundError, ValidationError } from "../framework/errors";
import {
  reserveUnitTransaction,
  UnitNotFoundError,
  UnitNotAvailableError,
  LeaseTermNotOfferedError,
  type ReservationResult,
} from "./reservation-repository";

export const ReserveParamsSchema = z.object({
  unitId: z.string().uuid(),
});

export const ReserveSchema = z.object({
  customerId: z.string().uuid(),
  leaseTerm: z.number().int().positive(),
});

export type ReserveParams = z.infer<typeof ReserveParamsSchema>;
export type ReserveBody = z.infer<typeof ReserveSchema>;

export async function reserveUnit(
  request: EndpointRequest<ReserveParams, ReserveBody>
): Promise<EndpointResponse<ReservationResult>> {
  const { unitId } = request.params;
  const { customerId, leaseTerm } = request.body;

  try {
    const reservation = await reserveUnitTransaction(unitId, customerId, leaseTerm);
    return { statusCode: 201, body: reservation };
  } catch (err) {
    if (err instanceof UnitNotFoundError) throw new NotFoundError(err.message);
    if (err instanceof UnitNotAvailableError) throw new ConflictError(err.message);
    if (err instanceof LeaseTermNotOfferedError) throw new ValidationError(err.message);
    throw err;
  }
}

registerEndpoint({
  method: "POST",
  path: "/inventory/{unitId}/reserve",
  permission: "inventory.reserve",
  paramsValidator: ReserveParamsSchema,
  validator: ReserveSchema,
  handler: reserveUnit,
});
