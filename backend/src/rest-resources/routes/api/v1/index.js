import express from 'express'
import demoRoutes from './demo.routes'

const v1Router = express.Router()

v1Router.use('/demo', demoRoutes)

export default v1Router
