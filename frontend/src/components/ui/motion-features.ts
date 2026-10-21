// The animation features for <LazyMotion> (see MotionProvider). Kept in a file of its own so the bundler
// splits them into a separate chunk that loads after the page — pages render and hydrate without them.
import { domAnimation } from 'framer-motion';

export default domAnimation;
