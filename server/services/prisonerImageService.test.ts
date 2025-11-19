import { Readable } from 'stream'
import PrisonApiClient from '../data/prisonApiClient'
import PrisonerImageService from './prisonerImageService'
import { HmppsUser } from '../interfaces/hmppsUser'

jest.mock('../data/prisonApiClient')

const user = { token: 'userToken', username: 'test' } as HmppsUser

describe('Prisoner image service', () => {
  let prisonApiClient: jest.Mocked<PrisonApiClient>
  let prisonerImageService: PrisonerImageService

  beforeEach(() => {
    prisonApiClient = new PrisonApiClient(null) as jest.Mocked<PrisonApiClient>
    prisonerImageService = new PrisonerImageService(prisonApiClient)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('getImage', () => {
    it('should get the prisoner image', async () => {
      prisonApiClient.getImage.mockResolvedValue(Readable.from('image'))
      await prisonerImageService.getImage('ABC123', user)
      expect(prisonApiClient.getImage).toHaveBeenCalledWith('ABC123', user)
    })
  })
})
