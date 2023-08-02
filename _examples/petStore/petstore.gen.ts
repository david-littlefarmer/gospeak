/* eslint-disable */
// PetStore vTODO 710269e9fe6e6aa3be39e53f8ec78be9694f5f04
// --
// Code generated by webrpc-gen@v0.13.0-dev with typescript generator. DO NOT EDIT.
//
// gospeak ./proto/api.go

// WebRPC description and code-gen version
export const WebRPCVersion = "v1"

// Schema version of your RIDL schema
export const WebRPCSchemaVersion = "vTODO"

// Schema hash generated from your RIDL schema
export const WebRPCSchemaHash = "710269e9fe6e6aa3be39e53f8ec78be9694f5f04"

//
// Types
//


export enum Status {
  approved = 'approved',
  pending = 'pending',
  closed = 'closed',
  new = 'new'
}

export interface Tag {
  ID: number
  Name: string
}

export interface Pet {
  id: string
  uuid: string
  name: string
  available: boolean
  photoUrls: Array<string>
  tags: Array<Tag>
  createdAt: string
  deletedAt?: string
  Tag: Tag
  TagPtr?: Tag
  TagsPtr: Array<Tag>
  status: string
}

export interface PetStore {
  createPet(args: CreatePetArgs, headers?: object, signal?: AbortSignal): Promise<CreatePetReturn>
  deletePet(args: DeletePetArgs, headers?: object, signal?: AbortSignal): Promise<DeletePetReturn>
  getPet(args: GetPetArgs, headers?: object, signal?: AbortSignal): Promise<GetPetReturn>
  listPets(headers?: object, signal?: AbortSignal): Promise<ListPetsReturn>
  updatePet(args: UpdatePetArgs, headers?: object, signal?: AbortSignal): Promise<UpdatePetReturn>
}

export interface CreatePetArgs {
  new: Pet
}

export interface CreatePetReturn {
  pet: Pet  
}
export interface DeletePetArgs {
  ID: number
}

export interface DeletePetReturn {  
}
export interface GetPetArgs {
  ID: number
}

export interface GetPetReturn {
  pet: Pet  
}
export interface ListPetsArgs {
}

export interface ListPetsReturn {
  pets: Array<Pet>  
}
export interface UpdatePetArgs {
  ID: number
  update: Pet
}

export interface UpdatePetReturn {
  pet: Pet  
}


  
//
// Client
//
export class PetStore implements PetStore {
  protected hostname: string
  protected fetch: Fetch
  protected path = '/rpc/PetStore/'

  constructor(hostname: string, fetch: Fetch) {
    this.hostname = hostname
    this.fetch = (input: RequestInfo, init?: RequestInit) => fetch(input, init)
  }

  private url(name: string): string {
    return this.hostname + this.path + name
  }
  
  createPet = (args: CreatePetArgs, headers?: object, signal?: AbortSignal): Promise<CreatePetReturn> => {
    return this.fetch(
      this.url('CreatePet'),
      createHTTPRequest(args, headers, signal)).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pet: <Pet>(_data.pet),
        }
      })
    }, (error) => {
      throw WebrpcRequestFailedError.new({ cause: `fetch(): ${error.message || ''}` })
    })
  }
  
  deletePet = (args: DeletePetArgs, headers?: object, signal?: AbortSignal): Promise<DeletePetReturn> => {
    return this.fetch(
      this.url('DeletePet'),
      createHTTPRequest(args, headers, signal)).then((res) => {
      return buildResponse(res).then(_data => {
        return {}
      })
    }, (error) => {
      throw WebrpcRequestFailedError.new({ cause: `fetch(): ${error.message || ''}` })
    })
  }
  
  getPet = (args: GetPetArgs, headers?: object, signal?: AbortSignal): Promise<GetPetReturn> => {
    return this.fetch(
      this.url('GetPet'),
      createHTTPRequest(args, headers, signal)).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pet: <Pet>(_data.pet),
        }
      })
    }, (error) => {
      throw WebrpcRequestFailedError.new({ cause: `fetch(): ${error.message || ''}` })
    })
  }
  
  listPets = (headers?: object, signal?: AbortSignal): Promise<ListPetsReturn> => {
    return this.fetch(
      this.url('ListPets'),
      createHTTPRequest({}, headers, signal)
      ).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pets: <Array<Pet>>(_data.pets),
        }
      })
    }, (error) => {
      throw WebrpcRequestFailedError.new({ cause: `fetch(): ${error.message || ''}` })
    })
  }
  
  updatePet = (args: UpdatePetArgs, headers?: object, signal?: AbortSignal): Promise<UpdatePetReturn> => {
    return this.fetch(
      this.url('UpdatePet'),
      createHTTPRequest(args, headers, signal)).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pet: <Pet>(_data.pet),
        }
      })
    }, (error) => {
      throw WebrpcRequestFailedError.new({ cause: `fetch(): ${error.message || ''}` })
    })
  }
  
}

  const createHTTPRequest = (body: object = {}, headers: object = {}, signal: AbortSignal | null = null): object => {
  return {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    signal
  }
}

const buildResponse = (res: Response): Promise<any> => {
  return res.text().then(text => {
    let data
    try {
      data = JSON.parse(text)
    } catch(error) {
      let message = ''
      if (error instanceof Error)  {
        message = error.message
      }
      throw WebrpcBadResponseError.new({
        status: res.status,
        cause: `JSON.parse(): ${message}: response text: ${text}`},
      )
    }
    if (!res.ok) {
      const code: number = (typeof data.code === 'number') ? data.code : 0
      throw (webrpcErrorByCode[code] || WebrpcError).new(data)
    }
    return data
  })
}

//
// Errors
//

export class WebrpcError extends Error {
  name: string
  code: number
  message: string
  status: number
  cause?: string

  /** @deprecated Use message instead of msg. Deprecated in webrpc v0.11.0. */
  msg: string

  constructor(name: string, code: number, message: string, status: number, cause?: string) {
    super(message)
    this.name = name || 'WebrpcError'
    this.code = typeof code === 'number' ? code : 0
    this.message = message || `endpoint error ${this.code}`
    this.msg = this.message
    this.status = typeof status === 'number' ? status : 0
    this.cause = cause
    Object.setPrototypeOf(this, WebrpcError.prototype)
  }

  static new(payload: any): WebrpcError {
    return new this(payload.error, payload.code, payload.message || payload.msg, payload.status, payload.cause)
  }
}

// Webrpc errors

export class WebrpcEndpointError extends WebrpcError {
  constructor(
    name: string = 'WebrpcEndpoint',
    code: number = 0,
    message: string = 'endpoint error',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcEndpointError.prototype)
  }
}

export class WebrpcRequestFailedError extends WebrpcError {
  constructor(
    name: string = 'WebrpcRequestFailed',
    code: number = -1,
    message: string = 'request failed',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcRequestFailedError.prototype)
  }
}

export class WebrpcBadRouteError extends WebrpcError {
  constructor(
    name: string = 'WebrpcBadRoute',
    code: number = -2,
    message: string = 'bad route',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcBadRouteError.prototype)
  }
}

export class WebrpcBadMethodError extends WebrpcError {
  constructor(
    name: string = 'WebrpcBadMethod',
    code: number = -3,
    message: string = 'bad method',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcBadMethodError.prototype)
  }
}

export class WebrpcBadRequestError extends WebrpcError {
  constructor(
    name: string = 'WebrpcBadRequest',
    code: number = -4,
    message: string = 'bad request',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcBadRequestError.prototype)
  }
}

export class WebrpcBadResponseError extends WebrpcError {
  constructor(
    name: string = 'WebrpcBadResponse',
    code: number = -5,
    message: string = 'bad response',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcBadResponseError.prototype)
  }
}

export class WebrpcServerPanicError extends WebrpcError {
  constructor(
    name: string = 'WebrpcServerPanic',
    code: number = -6,
    message: string = 'server panic',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcServerPanicError.prototype)
  }
}

export class WebrpcInternalErrorError extends WebrpcError {
  constructor(
    name: string = 'WebrpcInternalError',
    code: number = -7,
    message: string = 'internal error',
    status: number = 0,
    cause?: string
  ) {
    super(name, code, message, status, cause)
    Object.setPrototypeOf(this, WebrpcInternalErrorError.prototype)
  }
}


// Schema errors


export enum errors {
  WebrpcEndpoint = 'WebrpcEndpoint',
  WebrpcRequestFailed = 'WebrpcRequestFailed',
  WebrpcBadRoute = 'WebrpcBadRoute',
  WebrpcBadMethod = 'WebrpcBadMethod',
  WebrpcBadRequest = 'WebrpcBadRequest',
  WebrpcBadResponse = 'WebrpcBadResponse',
  WebrpcServerPanic = 'WebrpcServerPanic',
  WebrpcInternalError = 'WebrpcInternalError',
}

const webrpcErrorByCode: { [code: number]: any } = {
  [0]: WebrpcEndpointError,
  [-1]: WebrpcRequestFailedError,
  [-2]: WebrpcBadRouteError,
  [-3]: WebrpcBadMethodError,
  [-4]: WebrpcBadRequestError,
  [-5]: WebrpcBadResponseError,
  [-6]: WebrpcServerPanicError,
  [-7]: WebrpcInternalErrorError,
}

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>
