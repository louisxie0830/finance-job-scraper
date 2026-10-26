import KGI_CITIES from './kgiCities.ts';
import { createWorkdaySource } from './workday.ts';

const kgi = createWorkdaySource({
  id: 'kgi',
  name: 'KGI Financial Holding',
  host: 'cdfh.wd3.myworkdayjobs.com',
  tenant: 'cdfh',
  site: 'External',
  cities: KGI_CITIES,
});

export default kgi;
