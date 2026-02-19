# Description:
#   Technology
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot technology - Old Man Yells at Cloud
#
# Author:
#   maju6406

images = [
  "https://i.imgur.com/URV9Ea1.giff"
]

module.exports = (robot) ->
  robot.hear /technology/i, (msg) ->
    msg.send msg.random images
