import { createWorkdaySource } from './workday.ts';

const ctbc = createWorkdaySource({
  id: 'ctbc',
  name: 'CTBC Financial Holding',
  host: 'ctbcholding.wd3.myworkdayjobs.com',
  tenant: 'ctbcholding',
  site: 'External',
});

export default ctbc;
