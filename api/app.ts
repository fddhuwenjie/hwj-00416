import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createTables } from './src/db/schema.js'
import { seedData } from './src/db/seed.js'
import deviceRoutes from './src/routes/device.routes.js'
import orderRoutes from './src/routes/order.routes.js'
import customerRoutes from './src/routes/customer.routes.js'
import statsRoutes from './src/routes/stats.routes.js'
import maintenanceRoutes from './src/routes/maintenance.routes.js'
import contractRoutes from './src/routes/contract.routes.js'
import packageRoutes from './src/routes/package.routes.js'
import couponRoutes from './src/routes/coupon.routes.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

console.log('Initializing database...')
createTables()
console.log('Database tables created.')
seedData()
console.log('Database seeded.')

app.use('/api/devices', deviceRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/packages', packageRoutes)
app.use('/api/coupons', couponRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
