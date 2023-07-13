/* eslint-disable */
// PetStore  deebea506ab0cc4d4d7066f42ecbf59be30a6312
// --
// Code generated by webrpc-gen@v0.12.x-dev with typescript@v0.10.0 generator. DO NOT EDIT.
//
// gospeak ./proto/api.go

// WebRPC description and code-gen version
export const WebRPCVersion = "v1"

// Schema version of your RIDL schema
export const WebRPCSchemaVersion = ""

// Schema hash generated from your RIDL schema
export const WebRPCSchemaHash = "deebea506ab0cc4d4d7066f42ecbf59be30a6312"

//
// Types
//


export interface Tag {
  id: number
  name: string
}

export interface Pet {
  id: number
  name: string
  available: boolean
  photoUrlS: string
  tags: Tag
}

export interface PetStore {
  createPet(args: CreatePetArgs, headers?: object): Promise<CreatePetReturn>
  deletePet(args: DeletePetArgs, headers?: object): Promise<DeletePetReturn>
  getPet(args: GetPetArgs, headers?: object): Promise<GetPetReturn>
  listPets(headers?: object): Promise<ListPetsReturn>
  updatePet(args: UpdatePetArgs, headers?: object): Promise<UpdatePetReturn>
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
  
  createPet = (args: CreatePetArgs, headers?: object): Promise<CreatePetReturn> => {
    return this.fetch(
      this.url('CreatePet'),
      createHTTPRequest(args, headers)).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pet: <Pet>(_data.pet)
        }
      })
    })
  }
  
  deletePet = (args: DeletePetArgs, headers?: object): Promise<DeletePetReturn> => {
    return this.fetch(
      this.url('DeletePet'),
      createHTTPRequest(args, headers)).then((res) => {
      return buildResponse(res).then(_data => {
        return {
        }
      })
    })
  }
  
  getPet = (args: GetPetArgs, headers?: object): Promise<GetPetReturn> => {
    return this.fetch(
      this.url('GetPet'),
      createHTTPRequest(args, headers)).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pet: <Pet>(_data.pet)
        }
      })
    })
  }
  
  listPets = (headers?: object): Promise<ListPetsReturn> => {
    return this.fetch(
      this.url('ListPets'),
      createHTTPRequest({}, headers)
      ).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pets: <Array<Pet>>(_data.pets)
        }
      })
    })
  }
  
  updatePet = (args: UpdatePetArgs, headers?: object): Promise<UpdatePetReturn> => {
    return this.fetch(
      this.url('UpdatePet'),
      createHTTPRequest(args, headers)).then((res) => {
      return buildResponse(res).then(_data => {
        return {
          pet: <Pet>(_data.pet)
        }
      })
    })
  }
  
}

  
export interface WebRPCError extends Error {
  code: string
  msg: string
	status: number
}

const createHTTPRequest = (body: object = {}, headers: object = {}): object => {
  return {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  }
}

const buildResponse = (res: Response): Promise<any> => {
  return res.text().then(text => {
    let data
    try {
      data = JSON.parse(text)
    } catch(err) {
      throw { code: 'unknown', msg: `expecting JSON, got: ${text}`, status: res.status } as WebRPCError
    }
    if (!res.ok) {
      throw data // webrpc error response
    }
    return data
  })
}

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>
