export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Zapis'): HttpError =>
  new HttpError(404, 'not_found', `${what} nije pronađen.`);
