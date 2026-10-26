import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoPage } from '@/demo/DemoPage';
import HomePage from './HomePage';

export default function Page() {
  return DEMO_ON_SERVER ? <DemoPage route="home" /> : <HomePage />;
}
