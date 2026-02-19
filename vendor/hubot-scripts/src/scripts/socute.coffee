# Description:
#   So Cute
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot so cute - So Cute RIP Happy Endings
#
# Author:
#   maju6406

images = [
  "http://imgur.com/hfmyfhl.gif"
]

module.exports = (robot) ->
  robot.hear /so cute/i, (msg) ->
    msg.send msg.random images
