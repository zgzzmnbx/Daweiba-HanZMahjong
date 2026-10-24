import type {DoodleBoard} from './doodle';
import type {PublicRoomSnapshot,UtcMs} from './types';
/** No private player envelope, credentials, concealed tile registry or write capability. */
export type SpectatorSnapshot=Readonly<{serverNow:UtcMs;public:PublicRoomSnapshot;doodle?:DoodleBoard}>;
