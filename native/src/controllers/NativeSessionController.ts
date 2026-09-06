import { nativeTaskRepository } from '../repositories/NativeTaskRepository';
import { androidAlarmEngine } from '../services/alarm';
import { SessionController } from './SessionController';

export const nativeSessionController = new SessionController(
  nativeTaskRepository,
  androidAlarmEngine,
);
