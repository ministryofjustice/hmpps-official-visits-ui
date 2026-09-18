import { HmppsUser } from '../interfaces/hmppsUser'
import { Prison } from '../@types/bookAVideoLinkApi/types'
import BookAVideoLinkApiClient from '../data/bookAVideoLinkApiClient'

export default class BookAVideoLinkService {
  constructor(private readonly bookAVideoLinkApiClient: BookAVideoLinkApiClient) {}

  async getPrisons(user: HmppsUser): Promise<Prison[]> {
    return this.bookAVideoLinkApiClient.getPrisons(user)
  }
}
