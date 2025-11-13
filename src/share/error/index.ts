export enum HTTP_STATUS {
  HTTP_400_BAD_REQUEST = 400,
  HTTP_401_UNAUTHORIZED = 401,
  HTTP_404_NOT_FOUND = 404,
  HTTP_500_INTERNAL_SERVER_ERROR = 500,
}

export class CoreErr extends Error {
  public readonly detail?: { errors?: unknown };
  public readonly status: HTTP_STATUS;
  public readonly code: ErrCode;

  constructor(
    code: ErrCode,
    status: HTTP_STATUS = HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR,
    detail?: { errors?: unknown },
  ) {
    super();
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

export class BadReqErr extends CoreErr {
  constructor(code: ErrCode, detail?: { errors?: unknown }) {
    super(code, HTTP_STATUS.HTTP_400_BAD_REQUEST, detail);
  }
}

export class NotFoundErr extends CoreErr {
  constructor(code: ErrCode, detail?: { errors?: unknown }) {
    super(code, HTTP_STATUS.HTTP_404_NOT_FOUND, detail);
  }
}

export class UnAuthErr extends CoreErr {
  constructor(code: ErrCode, detail?: { errors?: unknown }) {
    super(code, HTTP_STATUS.HTTP_401_UNAUTHORIZED, detail);
  }
}

export * from './error-code';

import type { ErrCode } from './error-code';
