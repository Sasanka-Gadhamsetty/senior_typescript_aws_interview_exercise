import { reserveUnit } from "./reservation-handler";
import {
  reserveUnitTransaction,
  UnitNotFoundError,
  UnitNotAvailableError,
  LeaseTermNotOfferedError,
} from "./reservation-repository";
import { ConflictError, NotFoundError, ValidationError } from "../framework/errors";
import type { AuthenticatedUser } from "../framework/dispatcher";

// The handler is a thin orchestrator: it forwards to reserveUnitTransaction()
// and translates repository errors into HTTP errors. Unit tests for it should
// mock the repository boundary rather than a real Postgres connection - the
// transaction/locking behavior itself belongs in reservation-repository's
// own (integration-level) tests against a real or dockerized database.
jest.mock("./reservation-repository", () => {
  const actual = jest.requireActual("./reservation-repository");
  return {
    ...actual,
    reserveUnitTransaction: jest.fn(),
  };
});

const mockedReserve = reserveUnitTransaction as jest.MockedFunction<typeof reserveUnitTransaction>;

const user: AuthenticatedUser = { id: "agent-1", permissions: ["inventory.reserve"] };

function buildRequest(overrides: Partial<{ unitId: string; customerId: string; leaseTerm: number }> = {}) {
  return {
    params: { unitId: overrides.unitId ?? "11111111-1111-1111-1111-111111111111" },
    body: {
      customerId: overrides.customerId ?? "22222222-2222-2222-2222-222222222222",
      leaseTerm: overrides.leaseTerm ?? 12,
    },
    user,
  };
}

describe("reserveUnit", () => {
  beforeEach(() => {
    mockedReserve.mockReset();
  });

  it("returns 201 with the reservation on success", async () => {
    mockedReserve.mockResolvedValue({
      reservationId: "33333333-3333-3333-3333-333333333333",
      unitId: "11111111-1111-1111-1111-111111111111",
      customerId: "22222222-2222-2222-2222-222222222222",
      leaseTerm: 12,
      leaseRate: 1850,
      reservedAt: "2026-01-01T00:00:00.000Z",
    });

    const response = await reserveUnit(buildRequest());

    expect(response.statusCode).toBe(201);
    expect(response.body.reservationId).toBe("33333333-3333-3333-3333-333333333333");
    expect(mockedReserve).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      12
    );
  });

  it("maps UnitNotFoundError to a 404 NotFoundError", async () => {
    mockedReserve.mockRejectedValue(new UnitNotFoundError("Unit not found"));

    await expect(reserveUnit(buildRequest())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps UnitNotAvailableError to a 409 ConflictError", async () => {
    mockedReserve.mockRejectedValue(new UnitNotAvailableError("Unit not available"));

    await expect(reserveUnit(buildRequest())).rejects.toBeInstanceOf(ConflictError);
  });

  it("maps LeaseTermNotOfferedError to a 400 ValidationError", async () => {
    mockedReserve.mockRejectedValue(new LeaseTermNotOfferedError("Term not offered"));

    await expect(reserveUnit(buildRequest())).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates unexpected errors unchanged", async () => {
    mockedReserve.mockRejectedValue(new Error("connection reset"));

    await expect(reserveUnit(buildRequest())).rejects.toThrow("connection reset");
  });
});
