interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
}
interface Repository<T, K extends keyof T> {
    save(entity: T): Promise<T>;
    find(id: T[K]): Promise<T | null>;
}
class RepositoryClass implements Repository<Driver, "id"> {

    async save(entity: Driver): Promise<Driver> {
        return entity;
    }

    async find(id: Driver["id"]): Promise<Driver | null> {
        return null;
    }

}

class DriverService {
    constructor (private readonly repository: Repository<Driver, "id">){

    }
    async getDriver(id: string) {
        return this.repository.find(id);
    }
}

const permissions = {
  READ: "inventory.read",
  WRITE: "inventory.write",
  DELETE: "inventory.delete"
};
type PermissionsType =
  | "inventory.read"
  | "inventory.write"
  | "inventory.delete";

type Permission = typeof permissions[keyof typeof permissions]

interface Middleware<TRequest, TResponse> {

    execute(
        request: TRequest,
        next: () => Promise<TResponse>
    ): Promise<TResponse>;

}