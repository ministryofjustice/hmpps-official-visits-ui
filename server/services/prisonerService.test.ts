import PrisonerSearchApiClient from '../data/prisonerSearchApiClient'
import PrisonerService from './prisonerService'
import { PagePrisoner, Prisoner } from '../@types/prisonerSearchApi/types'
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

  describe('searchInCaseload', () => {
    const response = {
      totalPages: 1,
      totalElements: 1,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
      size: 10,
      content: [
        {
          prisonerNumber: 'A1111AA',
          firstName: 'AAAA',
          lastName: 'AAAA',
          dateOfBirth: '2011-01-01',
          gender: 'M',
          status: 'ACTIVE IN',
          prisonId: 'MDI',
        } as unknown as Prisoner,
      ],
      pageable: { page: 0, size: 10 },
    } as unknown as Promise<PagePrisoner>

    it('Retrieves prisoners with default pagination', async () => {
      prisonerSearchApiClient.searchInCaseload.mockResolvedValue(response)
      const result = await prisonerService.searchInCaseload('A1111AA', 'MDI', user)
      expect(prisonerSearchApiClient.searchInCaseload).toHaveBeenCalledWith('A1111AA', 'MDI', user, undefined)
      expect(result).toEqual(response)
    })

    it('Retrieves prisoners with for given pagination options', async () => {
      prisonerSearchApiClient.searchInCaseload.mockResolvedValue(response)
      const result = await prisonerService.searchInCaseload('A1111AA', 'MDI', user, {
        page: 0,
        size: 10,
      })
      expect(prisonerSearchApiClient.searchInCaseload).toHaveBeenCalledWith('A1111AA', 'MDI', user, {
        page: 0,
        size: 10,
      })
      expect(result).toEqual(response)
    })
  })
})
