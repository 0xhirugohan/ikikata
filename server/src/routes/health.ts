/**
 * Health and status routes
 */

import { Hono } from 'hono';
import { db } from '../database';

const health = new Hono();

/**
 * GET /health
 * Health check endpoint
 */
health.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    message: 'Sleep tracking server is running'
  });
});

/**
 * GET /health/stats
 * Database statistics (public)
 */
health.get('/stats', (c) => {
  const stats = db.getStats();
  
  return c.json({
    ...stats,
    timestamp: new Date().toISOString()
  });
});

export default health;