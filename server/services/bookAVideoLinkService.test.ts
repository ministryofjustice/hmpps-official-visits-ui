import { HmppsUser } from '../interfaces/hmppsUser'
import { mockMoorlandBvlsPrison } from '../testutils/mocks'
import BookAVideoLinkApiClient from '../data/bookAVideoLinkApiClient'
import BookAVideoLinkService from './bookAVideoLinkService'

jest.mock('../data/bookAVideoLinkApiClient')

const user = { token: 'userToken', username: 'test' } as HmppsUser

describe('Book a video link Service ', () => {
  let bookAVideoLinkClient: jest.Mocked<BookAVideoLinkApiClient>
  let bookAVideoLinkService: BookAVideoLinkService

  beforeEach(() => {
    bookAVideoLinkClient = new BookAVideoLinkApiClient(null) as jest.Mocked<BookAVideoLinkApiClient>
    bookAVideoLinkService = new BookAVideoLinkService(bookAVideoLinkClient)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should return BVLS prisons', async () => {
    bookAVideoLinkClient.getPrisons.mockResolvedValue([mockMoorlandBvlsPrison])
    const result = await bookAVideoLinkService.getPrisons(user)
    expect(result).toEqual([mockMoorlandBvlsPrison])
    expect(bookAVideoLinkClient.getPrisons).toHaveBeenCalledWith(user)
  })
})
