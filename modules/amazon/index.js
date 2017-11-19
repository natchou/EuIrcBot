var amazon = require('amazon-product-api');
var amazonClient = null;
var log;

module.exports.init = function(bot) {
  log = bot.log;
  bot.getConfig("amazon.json", function(err, conf) {
    if(err) return log.error("Unable to load amazon module: " + err);
    try {
      amazonClient = new amazon.createClient(conf);
    } catch(ex) {
      log.error("Error loading amazon library: " + ex);
    }
  });
};

var extractAsin = function(url) {
  var asin;
  var amazonRegex = /(B[0-9]{2}[0-9A-Z]{7}|[0-9]{9}(?:X|[0-9]))/;
  match = amazonRegex.exec(url);
  if(match && match[1])
    asin = match[0];
  return asin;
};

var generateErrorMessage = function(error) {
  var err = error[0].Error[0];
  var msg;
  // AWS.InvalidParameterValue is returned when an prospective ASIN isn't actually a real ASIN, so we squash it
  if (err.Code[0] != "AWS.InvalidParameterValue")
    msg = "Error: " + err.Message[0];
  return msg;
};

var generateResponse = function(results) {
  var attributes = results[0].ItemAttributes[0];
  var msg = attributes.Title;
  // Free Prime exclusives and sold out items do not have a price. If this occurs, simply return title
  if(typeof attributes.ListPrice !== "undefined") {
    var price = attributes.ListPrice[0].FormattedPrice[0];
    msg += `- [${price}]`;
  }
  return msg;
};

module.exports.url = function(url, reply) {
  if(amazonClient === null) return log.error("Unable to handle amazon url; lib not loaded");
  var asin = extractAsin(url);
  if(asin) {
    var query = { itemId: asin };
    amazonClient.itemLookup(query, function(err, results) {
      var msg;
      if(err) {
        msg = generateErrorMessage(err);
      } else {
        msg = generateResponse(results);
      }
      if(msg) return reply(msg);
    });
  }
};
