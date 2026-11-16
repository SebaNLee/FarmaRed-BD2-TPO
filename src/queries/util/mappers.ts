export type WithId<T> = Omit<T, "_id"> & { id: string };

/** Converts Mongo's internal `_id` into the domain model's `id`. */
export function withId<T extends { _id: string }>(document: T): WithId<T> {
  const { _id, ...rest } = document;
  return { id: _id, ...rest } as WithId<T>;
}
