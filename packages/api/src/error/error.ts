export class NotFoundError extends Error {
  status = 404

  static resourceNotFound(id: string): NotFoundError {
    return new NotFoundError(`Can not find resource <${id}>`)
  }
}

export class InvalidArgumentError extends Error {
  status = 400

  static notSupport(name: string): InvalidArgumentError {
    return new InvalidArgumentError(`${name} is not supported`)
  }

  static new(msg: string): InvalidArgumentError {
    return new InvalidArgumentError(msg)
  }
}

export class NoPermissionsError extends Error {
  status = 403

  static new(): NoPermissionsError {
    return new NoPermissionsError('no permissions')
  }
}

export class UnauthorizedError extends Error {
  status = 401

  static notLogin(): UnauthorizedError {
    return new UnauthorizedError('need login')
  }

  static notExist(): UnauthorizedError {
    return new UnauthorizedError('not exist')
  }

  static tokenInvalid(): UnauthorizedError {
    return new UnauthorizedError('token invalid')
  }
}

export class InternalError extends Error {
  status = 400

  static new(msg: string): InternalError {
    return new InternalError(msg)
  }
}

export class CyclicTransclusionError extends Error {
  status = 400

  static new(): CyclicTransclusionError {
    return new CyclicTransclusionError('cyclic transclusion appears')
  }
}

export class StorageError extends Error {
  status = 400

  static notSupportImport(): StorageError {
    return new StorageError(
      'Your current storage does not support import data into warehouse by connector, we are working in progress!',
    )
  }

  static invalidUpload(): StorageError {
    return new StorageError('Invalid upload file')
  }
}

export class DBTError extends Error {
  status = 400

  static unknownMaterializationError(): DBTError {
    return new DBTError(
      'Unknown materialization error, please check the version of your connector and dbt',
    )
  }

  static unspecifiedTypeError(): DBTError {
    return new DBTError(
      'unspecified type error, please check the version of your connector and dbt',
    )
  }
}
