'use strict'

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
  outdatedAbout()

  setTimeout(loop, 60 * 1000)
}

// Publish messages about outdated fanpages about info
function outdatedAbout () {
  Site.find({
    $or: [
      { 'sources.facebook.fanpages.latestSync.about': { $exists: false } },
      { 'sources.facebook.fanpages.latestSync.about': { $lt: new Date(Date.now() - 10 * 60 * 1000) } }
    ]
  }, {
    'sources.facebook.fanpages._id': 1,
    'sources.facebook.fanpages.latestSync.about': 1
  }, (err, docs) => {
    if (err) {
      log.error(`Error finding outdated about fanpages! Message: ${err}.`)
    } else {
      let items = docs.map((i) => {
        return {
          type: 'about',
          object_id: i.sources.facebook.fanpages[0]._id
        }
      })

      for (var i of items) {
        let data = JSON.stringify(i)
        client.publish('mob#facebook', data)
        log.info(`Published message to mob#facebook: "${data}".`)
      }
    }
  })
}
