import app from '../backend/src/server';

export default function handler(req: any, res: any) {
  return app(req, res);
}
