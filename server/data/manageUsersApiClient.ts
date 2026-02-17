import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import logger from '../../logger'
import config from '../config'
import { User } from '../@types/manageUsersApi/types'

export default class ManageUsersApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Manage users API', config.apis.manageUsersApi, logger, authenticationClient)
  }

  getUserByUsername(username: string, user: Express.User): Promise<User> {
    return this.get<User>({ path: `/users/${username}` }, asSystem(user.username))
  }
}
