import { createServer } from 'http'
import config from '~/configs/app.config'
import '~/json-schemas'
import gracefulShutDown from '~/helpers/gracefulShutDown'
import Logger from '~/libs/logger'
import app from '~/rest-resources'
import socketServer from '~/socket-resources'

const httpServer = createServer(app)
socketServer.attach(httpServer)

httpServer.listen({ port: config.get('port') }, () => {
  Logger.info('Server Started', { message: `Listening On ${config.get('port')}` })
})

process.on('SIGTERM', gracefulShutDown)
process.on('SIGINT', gracefulShutDown)
process.on('SIGUSR2', gracefulShutDown)
