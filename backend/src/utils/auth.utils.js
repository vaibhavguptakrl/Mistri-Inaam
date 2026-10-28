import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import config from '~/configs/app.config'

const SALT_ROUNDS = 10

/**
 * Auth building blocks — deliberately NOT wired into a signup/login flow.
 * Wire these into your own PlayerSignUp/Login services once you have a User model.
 */
export const hashPassword = (plainTextPassword) => {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS)
}

export const comparePassword = (plainTextPassword, passwordHash) => {
  if (!plainTextPassword || !passwordHash) return Promise.resolve(false)
  return bcrypt.compare(plainTextPassword, passwordHash)
}

export const signAccessToken = (payload, { expiresIn } = {}) => {
  return jwt.sign(payload, config.get('jwt.loginTokenSecret'), {
    expiresIn: expiresIn || config.get('jwt.loginTokenExpiry')
  })
}

export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.get('jwt.loginTokenSecret'))
}
