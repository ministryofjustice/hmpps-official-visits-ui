import { HmppsUser } from '../interfaces/hmppsUser'
import ManageUsersApiClient from '../data/manageUsersApiClient'

export default class ManageUserService {
  constructor(private readonly manageUsersApiClient: ManageUsersApiClient) {}

  public async getUserByUsername(username: string, user: HmppsUser) {
    return this.manageUsersApiClient.getUserByUsername(username, user)
  }
}
