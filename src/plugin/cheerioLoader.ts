import { load, type CheerioAPI } from 'cheerio';

const cheerioLoad = (data: string): CheerioAPI => load(data);

export default cheerioLoad;
