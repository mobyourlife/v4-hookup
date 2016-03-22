'use strict'

// Set constants
const TIME_OUTDATED = (10 * 60 * 1000)
const CHANNEL_NAME = 'mob#facebook'

// Load settings
const info = require('../package')

// Load modules
const bunyan = require('bunyan')
const redis = require('redis')
const mongoose = require('mongoose')
const Site = require('mob-api/models/site')

// Default database connection
const defaultConnection = 'mongodb://localhost:27017/mobyourlife'
const database = process.env.DATABASE || defaultConnection

// Initialise logging
const log = bunyan.createLogger({
  name: info.name
})

// Connect to the database
var client = redis.createClient()
mongoose.connect(database)

// Start process
log.info('Started hookup server...')
loop()

// Service loop
function loop () {
  checkOutdated('about')

  setTimeout(loop, 60 * 1000)
}

// Check if there's something outdated to publish
function checkOutdated (type) {
  let fieldName = `sources.facebook.fanpages.latestSync.${type}`
  let latestTime = new Date(Date.now() - TIME_OUTDATED)

  let exists = {}
  exists[fieldName] = { $exists: false }

  let outdated = {}
  outdated[fieldName] = { $lt: latestTime }

  let filters = {}
  filters['sources.facebook.fanpages._id'] = 1
  filters[fieldName] = 1

  Site.find({ $or: [ exists, outdated ] }, filters, (err, docs) => {
    docs.map((i) => {
      return {
        type: type,
        object_id: i.sources.facebook.fanpages[0]._id
      }
    }).forEach((i) => {
      let data = JSON.stringify(i)
      client.publish(CHANNEL_NAME, data)
      log.info(`Published message to "${CHANNEL_NAME}: "${data}".`)
    })
  })
}
