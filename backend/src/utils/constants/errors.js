import { StatusCodes } from 'http-status-codes'

export const ERROR_MSG = {
  SERVER_ERROR: 'Something went wrong',
  EXISTS: 'Already exists',
  NOT_FOUND: 'Record not found',
  NOT_EXISTS: 'Does not exists',
  NOT_ALLOWED: 'This action is not allowed',
  FAILED: 'Failed',
  EMITTER_ERROR: 'Failed to emit socket event'
}

// Central registry of error types. Every error a service/controller can raise
// should be declared here with a stable, unique `errorCode`, so clients can
// key off it regardless of the (i18n-able) `description` text.
export const RequestInputValidationErrorType = {
  name: 'RequestInputValidationError',
  statusCode: StatusCodes.BAD_REQUEST,
  isOperational: true,
  description: 'Please check the request data',
  errorCode: 1001
}

export const ResponseValidationErrorType = {
  name: 'ResponseInputValidationError',
  statusCode: StatusCodes.BAD_REQUEST,
  isOperational: false,
  description: 'Response validation failed please refer json schema of response',
  errorCode: 1002
}

export const SocketRequestInputValidationErrorType = {
  name: 'SocketRequestInputValidationError',
  statusCode: StatusCodes.BAD_REQUEST,
  isOperational: true,
  description: 'Please check the request data',
  errorCode: 1003
}

export const SocketResponseValidationErrorType = {
  name: 'SocketResponseValidationError',
  statusCode: StatusCodes.BAD_REQUEST,
  isOperational: false,
  description: 'Response validation of socket failed please refer json schema of response',
  errorCode: 1004
}

export const InternalServerErrorType = {
  name: 'InternalServerError',
  statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
  isOperational: true,
  description: 'Internal Server Error',
  errorCode: 1005
}

export const InvalidSocketArgumentErrorType = {
  name: 'InvalidSocketArgumentError',
  statusCode: StatusCodes.BAD_REQUEST,
  isOperational: true,
  description: 'Please provide, proper arguments eventName, [payloadObject], and [callback]',
  errorCode: 1006
}

export const UnAuthorizeUserErrorType = {
  name: 'UnAuthorize',
  statusCode: StatusCodes.FORBIDDEN,
  isOperational: true,
  description: 'Unauthorized',
  errorCode: 1007
}

export const InvalidTokenErrorType = {
  name: 'InvalidToken',
  statusCode: StatusCodes.UNAUTHORIZED,
  isOperational: true,
  description: 'Either access token not passed or it is expired',
  errorCode: 1008
}

export const TokenRequiredErrorType = {
  name: 'InvalidToken',
  statusCode: StatusCodes.UNAUTHORIZED,
  isOperational: true,
  description: 'Access token is required',
  errorCode: 1009
}

export const UserNotExistsErrorType = {
  name: 'UserNotExists',
  statusCode: StatusCodes.BAD_REQUEST,
  isOperational: true,
  description: 'User does not exists',
  errorCode: 1010
}

export const NotFoundErrorType = {
  name: 'NotFound',
  statusCode: StatusCodes.NOT_FOUND,
  isOperational: true,
  description: 'Record not found',
  errorCode: 1011
}

// Example domain error — delete once you add your own.
export const DemoErrorType = {
  name: 'DemoError',
  statusCode: StatusCodes.NOT_FOUND,
  isOperational: true,
  description: 'Demo record not found',
  errorCode: 1100
}
