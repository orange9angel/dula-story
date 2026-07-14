import { registerAll } from 'dula-assets';
import { SceneRegistry, registerScene } from 'dula-engine';

registerAll();

// Alias the default RoomScene as NobitaRoom for this episode.
class NobitaRoom extends SceneRegistry.RoomScene {
  constructor() {
    super();
    this.name = 'NobitaRoom';
  }
}

registerScene('NobitaRoom', NobitaRoom);
