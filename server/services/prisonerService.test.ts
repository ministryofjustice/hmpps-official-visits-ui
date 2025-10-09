import PrisonerSearchApiClient from '../data/prisonerSearchApiClient'
import PrisonerService from './prisonerService'
import { Prisoner } from '../@types/prisonerSearchApi/types'
import { HmppsUser } from '../interfaces/hmppsUser'

jest.mock('../data/prisonerSearchApiClient')

const user = { token: 'userToken', username: 'test' } as HmppsUser

describe('Prisoner service', () => {
  let prisonerSearchApiClient: jest.Mocked<PrisonerSearchApiClient>
  let prisonerService: PrisonerService

  beforeEach(() => {
    prisonerSearchApiClient = new PrisonerSearchApiClient(null) as jest.Mocked<PrisonerSearchApiClient>
    prisonerService = new PrisonerService(prisonerSearchApiClient)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('getPrisonerByPrisonerNumber', () => {
    it('Retrieves prisoner by prisoner number', async () => {
      prisonerSearchApiClient.getPrisonerByPrisonerNumber.mockResolvedValue({ prisonerNumber: 'A1111AA' } as Prisoner)
      const result = await prisonerService.getPrisonerByPrisonerNumber('A1111AA', user)
      expect(prisonerSearchApiClient.getPrisonerByPrisonerNumber).toHaveBeenCalledWith('A1111AA', user)
      expect(result).toEqual({ prisonerNumber: 'A1111AA' })
    })
  })
})
