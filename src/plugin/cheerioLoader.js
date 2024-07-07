import cheerio from 'cheerio';

const cheerioLoad = (data) => {
  return cheerio.load(data, {
    xmlMode: false,
    decodeEntities: true,
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
    recognizeSelfClosing: true,
    recognizeCDATA: true,
  });
};

export default cheerioLoad;
