import { Router, Request, Response } from 'express';
import { fetchFarmWeather } from '../services/weatherService.js';

const router = Router();

// GET /api/weather
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string) || 36.6777;
    const lng = parseFloat(req.query.lng as string) || -121.6555;

    const weather = await fetchFarmWeather(lat, lng);
    res.json({ success: true, data: weather });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
