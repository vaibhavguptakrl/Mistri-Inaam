import jwt from 'jsonwebtoken'
import config from '~/configs/app.config'
import { TokenRequiredErrorType, InvalidTokenErrorType } from '~/utils/constants/errors'
import Logger from '~/libs/logger'

/**
 * Auth stub for namespace-level socket auth — apply with `namespace.use(...)`
 * on any namespace that should require a logged-in user. Verifies the JWT
 * and attaches the decoded payload to `socket.user`.
 *
 * Extend this once you have a User model: look the user up by
 * `payload.id`, reject if not found/inactive, etc. (see passport.js for the
 * REST equivalent).
 */
export default async function authenticationSocketNamespaceMiddleware (socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.split('accessToken=')[1]?.split(';')[0]

    if (!token) return next(TokenRequiredErrorType)

    const payload = jwt.verify(token, config.get('jwt.loginTokenSecret'))

    socket.user = payload

    next()
  } catch (err) {
    Logger.error('Error in authenticationSocketNamespaceMiddleware', {
      message: err.message,
      exception: err
    })
    next(InvalidTokenErrorType)
  }
}
