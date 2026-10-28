import passport from 'passport'
import { UnAuthorizeUserErrorType } from '~/utils/constants/errors'

/**
 * Auth stub — verifies the JWT via the 'jwt' passport strategy (see passport.js)
 * and attaches the decoded payload to `req.user`. Extend the strategy's verify
 * callback (not this middleware) to add real user/status checks (banned,
 * inactive, etc.) once you have a User model.
 */
export function isAuthenticated (req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err || !user) {
      return next(UnAuthorizeUserErrorType)
    }

    req.user = user
    next()
  })(req, res, next)
}
