/**
 * Sleep tracking routes
 */

import { Hono } from 'hono';
import { requireAuth, getAuthenticatedUser } from '../auth';
import { db } from '../database';

const sleep = new Hono();

// Apply authentication middleware to all routes
sleep.use('*', requireAuth);

/**
 * POST /sleep/entries
 * Add a new sleep entry
 */
sleep.post('/entries', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const body = await c.req.json();
    
    const {
      id,
      date,
      sleepQuality,
      morningEnergy,
      timeToFallAsleep,
      afternoonEnergy,
      notes,
      stressLevel,
      screenTime,
      roomTemp,
      caffeineTime,
      exerciseTime,
      preBedtimeActivities,
      anxietyLevel
    } = body;

    // Validate required fields
    if (!id || !date || !sleepQuality || !morningEnergy || !timeToFallAsleep || !afternoonEnergy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate sleep quality values
    const validSleepQuality = ['good', 'fair', 'poor'];
    const validEnergyLevel = ['energized', 'alert', 'tired', 'exhausted'];
    const validSleepOnset = ['under-10', '10-20', '20-30', '30-60', 'over-60'];

    if (!validSleepQuality.includes(sleepQuality)) {
      return c.json({ error: 'Invalid sleep quality value' }, 400);
    }

    if (!validEnergyLevel.includes(morningEnergy) || !validEnergyLevel.includes(afternoonEnergy)) {
      return c.json({ error: 'Invalid energy level value' }, 400);
    }

    if (!validSleepOnset.includes(timeToFallAsleep)) {
      return c.json({ error: 'Invalid sleep onset time value' }, 400);
    }

    // Add entry to database
    const success = db.addSleepEntry(user.accountId, {
      id,
      date,
      sleepQuality,
      morningEnergy,
      timeToFallAsleep,
      afternoonEnergy,
      notes: notes || '',
      stressLevel,
      screenTime,
      roomTemp,
      caffeineTime,
      exerciseTime,
      preBedtimeActivities,
      anxietyLevel
    });

    if (!success) {
      return c.json({ error: 'Failed to add sleep entry' }, 500);
    }

    return c.json({
      success: true,
      message: 'Sleep entry added successfully'
    });

  } catch (error) {
    console.error('Add sleep entry error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /sleep/entries
 * Get sleep entries for authenticated user
 */
sleep.get('/entries', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;
    
    const entries = db.getSleepEntries(user.accountId, limit);
    
    return c.json({
      entries,
      count: entries.length
    });

  } catch (error) {
    console.error('Get sleep entries error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PUT /sleep/entries/:entryId
 * Update a sleep entry
 */
sleep.put('/entries/:entryId', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const entryId = c.req.param('entryId');
    const body = await c.req.json();

    const success = db.updateSleepEntry(user.accountId, entryId, body);

    if (!success) {
      return c.json({ error: 'Sleep entry not found or update failed' }, 404);
    }

    return c.json({
      success: true,
      message: 'Sleep entry updated successfully'
    });

  } catch (error) {
    console.error('Update sleep entry error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * DELETE /sleep/entries/:entryId
 * Delete a sleep entry
 */
sleep.delete('/entries/:entryId', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const entryId = c.req.param('entryId');

    const success = db.deleteSleepEntry(user.accountId, entryId);

    if (!success) {
      return c.json({ error: 'Sleep entry not found or delete failed' }, 404);
    }

    return c.json({
      success: true,
      message: 'Sleep entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete sleep entry error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /sleep/analytics
 * Get sleep analytics for authenticated user
 */
sleep.get('/analytics', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const entries = db.getSleepEntries(user.accountId);

    if (entries.length === 0) {
      return c.json({
        averageSleepQuality: 0,
        averageMorningEnergy: 0,
        averageAfternoonEnergy: 0,
        sleepOnsetTrend: 0,
        totalEntries: 0,
        streakDays: 0,
        recommendations: ['Start tracking your sleep to get insights!']
      });
    }

    // Calculate analytics
    const sleepQualityMap = { good: 3, fair: 2, poor: 1 };
    const energyLevelMap = { energized: 4, alert: 3, tired: 2, exhausted: 1 };
    const sleepOnsetMap = { 'under-10': 5, '10-20': 4, '20-30': 3, '30-60': 2, 'over-60': 1 };

    const avgSleepQuality = entries.reduce((sum, entry) => 
      sum + sleepQualityMap[entry.sleepQuality], 0) / entries.length;
    
    const avgMorningEnergy = entries.reduce((sum, entry) => 
      sum + energyLevelMap[entry.morningEnergy], 0) / entries.length;
    
    const avgAfternoonEnergy = entries.reduce((sum, entry) => 
      sum + energyLevelMap[entry.afternoonEnergy], 0) / entries.length;
    
    const avgSleepOnset = entries.reduce((sum, entry) => 
      sum + sleepOnsetMap[entry.timeToFallAsleep], 0) / entries.length;

    // Calculate streak (consecutive days with entries)
    const sortedDates = entries.map(e => new Date(e.date)).sort((a, b) => b.getTime() - a.getTime());
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const entryDate of sortedDates) {
      entryDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (avgSleepQuality < 2) {
      recommendations.push('Consider improving your sleep environment or routine');
    }
    if (avgSleepOnset < 3) {
      recommendations.push('Try to fall asleep faster - consider relaxation techniques');
    }
    if (avgMorningEnergy < 2.5) {
      recommendations.push('Focus on getting more restorative sleep');
    }
    if (entries.length < 7) {
      recommendations.push('Track more days to get better insights');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your sleep patterns look good! Keep it up.');
    }

    return c.json({
      averageSleepQuality: Math.round(avgSleepQuality * 100) / 100,
      averageMorningEnergy: Math.round(avgMorningEnergy * 100) / 100,
      averageAfternoonEnergy: Math.round(avgAfternoonEnergy * 100) / 100,
      sleepOnsetTrend: Math.round(avgSleepOnset * 100) / 100,
      totalEntries: entries.length,
      streakDays: streak,
      recommendations
    });

  } catch (error) {
    console.error('Get sleep analytics error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default sleep;