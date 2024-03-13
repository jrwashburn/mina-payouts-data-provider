import { Request, Response, NextFunction } from 'express';
import configuration from '../configurations/environmentConfiguration';

export function checkTrustArchiveDatabaseHeight(req: Request, res: Response, next: NextFunction) {
  if (!configuration.trustArchiveDatabaseHeight) {
    res.status(503).json({ error: `Service Unavailable: Archive database height not trusted since it is off by more than ${configuration.archiveDbRecencyThreshold} blocks` });
    return;
  }
  next();
}