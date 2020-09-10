const ParseXML = require('../../data/ParseXML');
const SendResponse = require('../../helpers/SendResponse');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function Get_AllItems(req, res, cache) {
  /**
   * @type {[import('../../Cache/CacheItem'), boolean]}
   */
  const [cacheItem, cached] = await ParseXML.getAllFiles(cache);
  console.log(cacheItem)
  return SendResponse.JSON(res, cacheItem.data, cached, cacheItem.cachedAt);
}

module.exports = Get_AllItems;