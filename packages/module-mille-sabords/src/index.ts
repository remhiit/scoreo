/**
 * What the host may import — the manifest and the module, nothing else.
 *
 * The scoring rules are deliberately not re-exported here: Scoreo imports this
 * entry point eagerly to list the module, so anything reachable from it risks
 * riding into the main bundle. The domain travels in the screen's chunk, and
 * the module's own code reaches it by relative path.
 */
export { milleSabordsManifest, milleSabordsModule } from './module'
