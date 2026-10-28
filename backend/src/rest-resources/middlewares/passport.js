import passport from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import config from '~/configs/app.config'

/**
 * Auth stub — wires a passport-jwt strategy so `isAuthenticated.middleware.js`
 * has something to call, but does NOT implement signup/login/refresh.
 *
 * To make this real:
 *  1. Add a User model under src/db/models
 *  2. Replace the `done(null, payload)` below with a real user lookup
 *     (e.g. `dbModels.User.findByPk(payload.id)`) and reject if not found/inactive
 *  3. Add signup/login services + routes that call `signAccessToken` from
 *     src/utils/auth.utils.js
 */
export default function initPassport () {
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromExtractors([
      ExtractJwt.fromAuthHeaderAsBearerToken(),
      (req) => req?.cookies?.accessToken || null
    ]),
    secretOrKey: config.get('jwt.loginTokenSecret')
  }

  passport.use('jwt', new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // TODO: replace with a real user lookup once you have a User model
      if (!payload?.id) return done(null, false)
      return done(null, payload)
    } catch (error) {
      return done(error, false)
    }
  }))
}
