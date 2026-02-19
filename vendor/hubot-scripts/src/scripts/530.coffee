
# Description:
#   530
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot 530
#
# Author:
#   maju6406

fivethirty = [
  "https://media.giphy.com/media/QzlAdQIbcM7sY/giphy.gif"
]

module.exports = (robot) ->
  robot.hear /530/i, (msg) ->
    msg.send msg.random fivethirty
