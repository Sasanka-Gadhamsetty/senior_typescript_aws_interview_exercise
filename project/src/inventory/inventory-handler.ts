import { registerEndpoint, type EndpointRequest, type EndpointResponse } from "../framework/dispatcher";
import { GetInventoryParamsSchema, type GetInventoryParams, type InventoryUnitResponse } from "./inventory-schema";
import { findActiveInventoryByProperty } from "./inventory-repository";

export async function getInventory(
  request: EndpointRequest<GetInventoryParams, undefined>
): Promise<EndpointResponse<InventoryUnitResponse[]>> {
  const units = await findActiveInventoryByProperty(request.params.propertyId);
  return { statusCode: 200, body: units };
}

registerEndpoint({
  method: "GET",
  path: "/properties/{propertyId}/inventory",
  permission: "inventory.read",
  paramsValidator: GetInventoryParamsSchema,
  handler: getInventory,
});
