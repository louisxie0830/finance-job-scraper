import axios from '../../plugin/axiosInstance.js';
import cheerioLoad from '../../plugin/cheerioLoader.js';

const jobs = async (req, res) => {
  try {
    const url = 'https://bankrecruit.sinopac.com/jobSearch/';
    const { data } = await axios.get(url);
    console.log('data: ', data);
    if (!data) throw new Error('Failed to load the webpage.');
  } catch (error) {
    throw new Error(`Error occurred while scraping jobs: ${error.message}`);
  }
};

export default jobs;
