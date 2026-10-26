import { createWorkdaySource } from './workday.ts';

const kgi = createWorkdaySource({
  id: 'kgi',
  name: 'KGI Financial Holding',
  host: 'cdfh.wd3.myworkdayjobs.com',
  tenant: 'cdfh',
  site: 'External',
});

export default kgi;
